import React from 'react';
import { CustomButton } from '@/components/CustomButton';
import MatchInfo from '@/components/MatchInfo';
import { UserProps, UserStatus } from '@/interfaces/UserProps';
import { SwitchProps } from '@chakra-ui/react';
import MainLayout from '@/layouts/MainLayout';
import {
  Box,
  Center,
  Flex,
  FormControl,
  FormLabel,
  SimpleGrid,
  Switch,
  Text,
  VStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { ReactElement } from 'react';
import { Socket } from 'socket.io-client';
import { gameStore } from '@/stores/gameStore';
import { useRouter } from 'next/router';
import { removeEmitHelper } from 'typescript';

export default function GameOptionsPage() {
  const router = useRouter();
  const [valueOpt1, setValueOpt1] = React.useState(false);
  const [valueOpt2, setValueOpt2] = React.useState(false);
  const [valueInt1, setValueInt1] = React.useState(0);
  const [valueInt2, setValueInt2] = React.useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [timeSpent, setTimeSpent] = useState<number>(1);

  const { socket, room } = gameStore();

  useEffect(() => {
    const id = setInterval(() => setTimeSpent((cur) => cur + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (valueOpt1 === false) {
      setValueInt1(0);
    } else {
      setValueInt1(1);
    }
  }, [valueOpt1]);

  useEffect(() => {
    if (valueOpt2 === false) {
      setValueInt2(0);
    } else {
      setValueInt2(1);
    }
  }, [valueOpt2]);

  //플레이어 이름을 통해서 정보 가져오기 필요
  const leftUser: UserProps = {
    id: room.players[0].user.id,
    name: room.players[0].user.username,
    imgUrl: '',
    status: room.players[0].user.status,
    rating: room.players[0].user.rating,
  };

  const rightUser: UserProps = {
    id: room.players[1].user.id,
    name: room.players[1].user.username,
    imgUrl: '',
    status: room.players[1].user.status, //UserStatus.INGAME,
    rating: room.players[1].user.rating,
  };

  const isMyTurn: boolean = true;

  async function handleMatchBtnClicked() {
    setTimeSpent(1);
    if (socket === undefined) {
      console.log('socket is undefined');
      alert('Sockect is not working Critical ERROR!!');
      // disconnectSocket();
      // router.push('/');
    } else {
      console.log(room.gameRoomName);
      console.log(valueInt1);
      console.log(valueInt2);
      console.log('Player readyGame');
      socket.emit('readyGame', {
        gameRoomName: room.gameRoomName,
        backgroundColor: valueInt1,
        mode: valueInt2,
      });
      onOpen();
    }
  }

  function handleMatchCancelBtnClicked() {
    if (room.gameRoomName === '') {
      // disconnectSocket();
      console.log('socket is disconnected1234');
    }
    onClose();
  }

  // TODO : Form 요청 보내는 로직 추가
  // TODO : READY 했을 때 구역 disabled 되도록 변경
  return (
    <>
      <Head>
        <title>게임 옵션 선택 | LastPong</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Flex
        w="30%"
        minW="400px"
        h="100%"
        direction="column"
        margin="auto"
        alignItems="center"
        justifyContent="center"
      >
        <Box my={5}>
          <MatchInfo me={leftUser} opp={rightUser} />
        </Box>
        <Box my={5}>
          <Text fontSize="2xl">CHOOSE A GAME OPTIONS</Text>
        </Box>
        <Box bg="white" p={20} borderRadius="42">
          <FormControl display="flex" alignItems="center" mb={10}>
            <FormLabel htmlFor="dark-mode" mb="0">
              <Text fontSize="xl">DARK MODE?</Text>
            </FormLabel>
            <Switch size="lg" id="dark-mode" onChange={(e) => setValueOpt1(!valueOpt1)} />
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="fast-mode" mb="0">
              <Text fontSize="xl">FAST MODE?</Text>
            </FormLabel>
            <Switch size="lg" id="dark-mode" onChange={(e) => setValueOpt2(!valueOpt2)} />
          </FormControl>
        </Box>
        <Box py={10}>
          <CustomButton size="lg" onClick={handleMatchBtnClicked}>
            READY
          </CustomButton>
        </Box>
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="main" color="white">
          <Center>
            <VStack>
              <ModalHeader>READY FOR THE GAME...</ModalHeader>
              <ModalBody fontSize="6xl">{timeSpent}</ModalBody>
              <ModalFooter>
                <CustomButton size="md" onClick={handleMatchCancelBtnClicked}>
                  CANCEL
                </CustomButton>
              </ModalFooter>
            </VStack>
          </Center>
        </ModalContent>
      </Modal>
    </>
  );
}

GameOptionsPage.getLayout = function (page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
