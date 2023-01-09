import CustomAvatar from '@/components/CustomAvatar';
import { CustomButton } from '@/components/CustomButton';
import MatchHistory from '@/components/MatchHistory';
import WinLoseSum from '@/components/WinLoseSum';
import { MatchHistoryProps } from '@/interfaces/MatchProps';
import { UserProps, UserStatus } from '@/interfaces/UserProps';
import MainLayout from '@/layouts/MainLayout';
import { userStore } from '@/stores/userStore';
import { convertRawUserToUser } from '@/utils/convertRawUserToUser';
import { customFetch } from '@/utils/customFetch';
import { Box, Center, Divider, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ReactElement, useEffect, useState } from 'react';

export default function UserProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>();
  const [user, setUser] = useState<UserProps>();
  const { friends, addFriend, deleteFriend, blockedUsers, addBlock, deleteBlock } = userStore();
  const [isFriend, setIsFriend] = useState<boolean>(false); // TODO: 연동
  const [isBlocked, setIsBlocked] = useState<boolean>(false); // TODO: 연동

  useEffect(() => {
    if (user === undefined) {
      return;
    }
    setIsFriend(friends.some(({ name }) => name === user.name));
  }, [friends, user]);

  useEffect(() => {
    if (user === undefined) {
      return;
    }
    setIsBlocked(blockedUsers.some(({ name }) => name === user.name));
  }, [blockedUsers, user]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    setUsername(router.query.username as string);
  }, [router.isReady]);

  useEffect(() => {
    async function setUserInfo() {
      try {
        const rawUser = await customFetch('GET', `/user/name/${username}`);
        setUser(await convertRawUserToUser(rawUser));
      } catch (e) {
        if (e instanceof Error) {
          console.log(e.message);
          return;
        }
      }
    }
    if (username === undefined) {
      return;
    }
    setUserInfo();
  }, [username]);

  const winCnt = 42;
  const loseCnt = 42;

  const dummyMatchHistory: MatchHistoryProps = {
    myName: 'asdfasdf',
    myScore: 4,
    oppName: 'pongmaster',
    oppScore: 10,
  };

  return (
    <>
      {user === undefined ? null : (
        <VStack>
          <Head>
            <title>{`${user.name} | LastPong`}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <Flex
            bg="white"
            flexDirection="column"
            borderRadius={42}
            w="40%"
            minW="500px"
            margin="auto"
            alignItems="center"
            justifyContent="center"
            my={30}
            p={20}
          >
            <HStack>
              <Box mr={10}>
                <CustomAvatar url={user.imgUrl} size="xl" />
              </Box>
              <VStack>
                <Text fontSize="3xl" color="main">
                  {user.name.toUpperCase()}
                </Text>
                <Text fontSize="lg">{`RATING ${user.rating}`}</Text>
              </VStack>
            </HStack>
            <Divider border="1px" borderColor="main" my={10} />
            <WinLoseSum winCnt={winCnt} loseCnt={loseCnt} fontSize="3xl" />
            <VStack w="100%" my={10} maxH="15vh" overflowY="scroll">
              {[...Array(10)].map((_, idx) => (
                <MatchHistory
                  key={idx}
                  myName={dummyMatchHistory.myName}
                  myScore={dummyMatchHistory.myScore}
                  oppName={dummyMatchHistory.oppName}
                  oppScore={dummyMatchHistory.oppScore}
                />
              ))}
            </VStack>
          </Flex>
          <HStack>
            {!isFriend ? (
              <CustomButton
                size="xl"
                onClick={() => {
                  addFriend(user.name);
                }}
              >
                ADD FRIEND
              </CustomButton>
            ) : (
              <CustomButton
                size="xl"
                onClick={() => {
                  deleteFriend(user.name);
                }}
              >
                DELETE FRIEND
              </CustomButton>
            )}
            {!isBlocked ? (
              <CustomButton
                size="xl"
                onClick={() => {
                  addBlock(user.name);
                }}
              >
                BLOCK
              </CustomButton>
            ) : (
              <CustomButton
                size="xl"
                onClick={() => {
                  deleteBlock(user.name);
                }}
              >
                UNBLOCK
              </CustomButton>
            )}
          </HStack>
        </VStack>
      )}
    </>
  );
}

UserProfilePage.getLayout = function (page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
