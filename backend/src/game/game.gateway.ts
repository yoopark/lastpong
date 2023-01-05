import { Body, HttpException, HttpStatus } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from 'src/auth/service/auth.service';
import { User } from 'src/user/entity/user.entity';
import { userStatus } from 'src/user/enum/status.enum';
import { UserService } from 'src/user/service/user.service';
import {
  GamePlayerDto,
  GameRoomNameDto,
  ReadyGameOptionDto,
  TouchBarDto,
} from './dto/game.dto';
import { gameStatus, PlayerType } from './enum/game.enum';
import { GameService } from './game.service';

const socket_username = {};

@WebSocketGateway({ namespace: 'game', cors: true })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly gameService: GameService,
  ) {}

  @WebSocketServer()
  public server: any;

  /* --------------------------
	|				handleConnection 		|
	|				handleDisconnect		|
	---------------------------*/

  async handleConnection(socket: Socket): Promise<void | WsException> {
    try {
      const user = await this.authService.findUserByRequestToken(socket);
      if (!user) {
        socket.disconnect();
        throw new WsException('소켓 연결 유저 없습니다.');
      }

      // await this.userService.updateStatus(user.id, userStatus.GAMECHANNEL);
      await this.userService.updateStatus(user.id, userStatus.INGAME);

      socket.data.user = user;
      socket_username[user.username] = socket;

      socket.emit('connection', { message: `${user.username} 연결`, user });
    } catch (e) {
      return new WsException(e.message);
    }
  }
  async handleDisconnect(socket: Socket): Promise<void | WsException> {
    try {
      const user = socket.data.user;
      if (!user) throw new WsException('소켓 연결 유저 없습니다.');

      const gameRoomName = this.gameService.findGameRoomOfUser(user.id);
      if (gameRoomName) await this.exitGameRoom(socket, { gameRoomName });

      await this.userService.updateStatus(user.id, userStatus.ONLINE);

      socket.emit('disconnection', { message: `${user.username} 연결해제` });
    } catch (e) {
      return new WsException(e.message);
    }
  }

  /* --------------------------
	|				findGameRooms 		|
	---------------------------*/

  @SubscribeMessage('findGameRooms')
  findGameRooms(socket: Socket): void | WsException {
    try {
      const gameRooms = this.gameService.findGameRooms();

      const result = [];

      for (const gameroomKey of gameRooms.keys()) {
        result.push(gameRooms.get(gameroomKey));
      }

      socket.emit('findGameRooms', { gameRoom: result });
    } catch (e) {
      return new WsException(e.message);
    }
  }

  /* --------------------------
	|				createGameRoom 		|
	|				joinGameRoom		|
	|				readyGame		|
	|				startGame		|
	|				exitGameRoom		|
	---------------------------*/

  @SubscribeMessage('createGameRoom')
  createGameRoom(socket: Socket): void | WsException {
    try {
      const user = socket.data.user;
      if (!user) throw new WsException('소켓 연결 유저 없습니다.');

      const randomRoomName = String(Math.floor(Math.random() * 1e9));

      let gameRoom = this.gameService.findGameRoom(randomRoomName);
      if (gameRoom) throw new WsException('이미 존재하는 게임룸 입니다');

      gameRoom = this.gameService.createGameRoom(randomRoomName);
      if (!gameRoom) throw new WsException('게임룸 생성 실패했습니다.');

      socket.emit('createGameRoom', {
        message: `${randomRoomName} 게임룸이 생성되었습니다.`,
        gameRoom,
      });
    } catch (e) {
      return new WsException(e.message);
    }
  }

  @SubscribeMessage('joinGameRoom')
  async joinGameRoom(
    socket: Socket,
    body: GameRoomNameDto,
  ): Promise<void | WsException> {
    try {
      const user: User = socket.data.user;
      if (!user) throw new WsException('소켓 연결 유저 없습니다.');

      const gameRoom = this.gameService.findGameRoom(body.gameRoomName);
      if (!gameRoom) throw new WsException('존재하지 않는 게임룸 입니다');

      for (const player of gameRoom.players) {
        if (player.user.username == socket.data.user.username)
          throw new WsException('이미 참여중인 게임룸입니다.');
      }

      const result = this.gameService.joinGameRoom(socket, gameRoom);
      socket.join(result.gameRoom.gameRoomName);

      if (result.user == PlayerType.PLAYER) {
        this.server.to(gameRoom.gameRoomName).emit('joinGameRoom', {
          message: `${body.gameRoomName} 게임룸에 ${user.username} 플레이어가 들어왔습니다.`,
          gameRoom,
        });
      } else if (result.user == PlayerType.SPECTATOR) {
        this.server.to(gameRoom.gameRoomName).emit('joinGameRoom', {
          message: `${body.gameRoomName} 게임룸에 ${user.username} 관찰자가 들어왔습니다.`,
          gameRoom,
        });
      } else {
        throw new WsException('PlayerType이 정의되지 않은 유저 입니다.');
      }

      // await this.userService.updateStatus(user.id, userStatus.GAMEROOM);
      await this.userService.updateStatus(user.id, userStatus.INGAME);
    } catch (e) {
      return new WsException(e.message);
    }
  }

  @SubscribeMessage('readyGame')
  readyGame(socket: Socket, body: ReadyGameOptionDto): void | WsException {
    try {
      const user = socket.data.user;
      if (!user) throw new WsException('소켓 연결 유저 없습니다.');
      const player = this.gameService.findPlayerInGameRoom(
        user.id,
        body.gameRoomName,
      );
      if (!player)
        throw new WsException(
          `${body.gameRoomName}에 해당 플레이어가 없습니다.`,
        );

      const gameRoom = this.gameService.readyGame(
        body.gameRoomName,
        player,
        body.gameOption,
      );

      if (!gameRoom) {
        this.server
          .to(body.gameRoomName)
          .emit('wait', { message: `다른 유저를 기다리는 중입니다.` });
      } else {
        this.server.to(gameRoom.gameRoomName).emit('readyGame', {
          message: `양 쪽 유저 게임 준비 완료`,
          gameRoomOptions: gameRoom.facts,
          players: gameRoom.players.map((player) => player.user),
        });
      }
    } catch (e) {
      return new WsException(e.message);
    }
  }

  @SubscribeMessage('startGame')
  async startGame(
    socket: Socket,
    body: GameRoomNameDto,
  ): Promise<void | WsException> {
    try {
      const user = socket.data.user;
      if (!user) throw new WsException('소켓 연결 유저 없습니다.');

      const player = this.gameService.findPlayerInGameRoom(
        user.id,
        body.gameRoomName,
      );
      if (!player)
        throw new WsException(
          `${body.gameRoomName}에 해당 플레이어는 없습니다.`,
        );

      const gameRoom = this.gameService.findGameRoom(player.gameRoomName);
      if (!gameRoom) throw new WsException('존재하지 않는 게임룸 입니다');

      let ballPosition;
      if (gameRoom.gameStatus == gameStatus.COUNTDOWN) {
        ballPosition = this.gameService.resetBallPosition(gameRoom);
        gameRoom.gameStatus = gameStatus.GAMEPLAYING;
      } else {
      }

      if (!ballPosition)
        throw new WsException('게임 시작 전 공셋팅에 실패했습니다.');

      this.server
        .to(gameRoom.gameRoomName)
        .emit('ball', { message: 'ball position', ballPosition });

      gameRoom.gameStatus = gameStatus.GAMEPLAYING;

      let score: number[];

      if (gameRoom.gameStatus == gameStatus.GAMEPLAYING) {
        const interval = setInterval(() => {
          if (gameRoom.gameStatus != gameStatus.GAMEPLAYING) {
            clearInterval(interval);
          }

          score = this.gameService.updateScore(gameRoom);
          if (score)
            this.server
              .to(gameRoom.gameRoomName)
              .emit('score', { message: 'score', score });

          this.gameService.isGameOver(gameRoom, this.server, socket);

          ballPosition =
            this.gameService.updateBallPositionAfterTouchBar(gameRoom);
          if (ballPosition)
            this.server
              .to(gameRoom.gameRoomName)
              .emit('ball', { message: 'ball position', ballPosition });

          ballPosition =
            this.gameService.updateBallPositionAferTouchTopOrBottom(gameRoom);
          if (ballPosition)
            this.server
              .to(gameRoom.gameRoomName)
              .emit('ball', { message: 'ball position', ballPosition });

          ballPosition = this.gameService.updateBallPositionAndVelocity(
            gameRoom.playing.ball.position.x,
            gameRoom.playing.ball.position.y,
            gameRoom,
          );
          if (ballPosition)
            this.server
              .to(gameRoom.gameRoomName)
              .emit('ball', { message: 'ball position', ballPosition });
        }, 30);
      } else {
        gameRoom.gameStatus = gameStatus.COUNTDOWN;

        throw new WsException('게임 시작 전 GAMEPLAYING 문제 발생했습니다.');
      }
    } catch (e) {
      return new WsException(e.message);
    }
  }

  @SubscribeMessage('exitGameRoom')
  async exitGameRoom(
    socket: Socket,
    body: GameRoomNameDto,
  ): Promise<void | WsException> {
    try {
      const user: User = socket.data.user;
      if (!user) throw new WsException('소켓 연결 유저 없습니다.');

      const gameRoom = this.gameService.findGameRoom(body.gameRoomName);
      if (!gameRoom) throw new WsException('존재하지 않는 게임룸 입니다');

      const player: GamePlayerDto = this.gameService.findPlayerInGameRoom(
        user.id,
        body.gameRoomName,
      );

      const spectator: GamePlayerDto = this.gameService.findSpectatorInGameRoom(
        user.id,
        body.gameRoomName,
      );

      if (player || spectator) {
        await this.gameService.exitGameRoom(this.server, socket);

        if (player)
          this.server.to(gameRoom.gameRoomName).emit('exitGameRoom', {
            message: `${player.user.username}가 게임룸에서 나갑니다.`,
          });
        if (spectator)
          this.server
            .to(gameRoom.gameRoomName)
            .emit('exitGameRoom', { message: `관찰자가 게임룸에서 나갑니다.` });
        socket.emit('exitGameRoom', { message: `게임룸에서 나왔습니다.` });
        // await this.userService.updateStatus(user.id, userStatus.GAMECHANNEL);
        await this.userService.updateStatus(user.id, userStatus.INGAME);
      } else {
        throw new WsException('해당룸에 당신은 존재하지 않습니다.');
      }
    } catch (e) {
      return new WsException(e.message);
    }
  }

  /* --------------------------
	|				randomGameMatch 		|
	---------------------------*/

  @SubscribeMessage('randomGameMatch')
  randomGameMatching(socket: Socket): void | WsException {
    try {
      const user: User = socket.data.user;
      if (!user) throw new WsException('소켓 연결 유저 없습니다.');

      const gameRoom = this.gameService.randomGameMatching(socket);

      if (gameRoom) {
        this.server.to(gameRoom.gameRoomName).emit('randomGameMatch', {
          message: '랜덤 매칭 된 룸 이름입니다.',
          gameRoom,
        });
      }
    } catch (e) {
      return new WsException(e.message);
    }
  }

  /* --------------------------
	|				touchBar 		|
	---------------------------*/

  @SubscribeMessage('touchBar')
  async updatetouchBar(
    socket: Socket,
    body: TouchBarDto,
  ): Promise<void | WsException> {
    try {
      const user: User = socket.data.user;
      if (!user) throw new WsException('소켓 연결 유저 없습니다.');

      const gameRoom = await this.gameService.findGameRoom(body.gameRoomName);
      if (!gameRoom) throw new WsException('존재하지 않는 게임룸 입니다');

      const player: GamePlayerDto = await this.gameService.findPlayerInGameRoom(
        socket.data.user.id,
        body.gameRoomName,
      );
      if (!player)
        throw new WsException('해당룸에 플레이어는 존재하지 않습니다.');

      player.touchBar = body.touchBar * gameRoom.facts.display.height;
      this.server.to(gameRoom.gameRoomName).emit('touchBar', {
        message: 'touchBar',
        player: player.user.id,
        touchBar: body.touchBar,
      });
    } catch (e) {
      return new WsException(e.message);
    }
  }
}
