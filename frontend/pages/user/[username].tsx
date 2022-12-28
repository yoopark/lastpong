import CustomAvatar from '@/components/CustomAvatar';
import { CustomButton } from '@/components/CustomButton';
import MatchHistory from '@/components/MatchHistory';
import WinLoseSum from '@/components/WinLoseSum';
import { MatchHistoryProps } from '@/interfaces/MatchProps';
import { UserProps, UserStatus } from '@/interfaces/UserProps';
import MainLayout from '@/layouts/MainLayout';
import { Box, Center, Divider, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ReactElement } from 'react';

export default function UserProfilePage() {
  const router = useRouter();
  let username: string | string[] | undefined = router.query.username;
  if (username === undefined) {
    username = '';
  } else if (Array.isArray(username)) {
    username = username.join('');
  }

  const user: UserProps = {
    name: username,
    imgUrl: '',
    status: UserStatus.inGame,
    rating: 1028,
    winCnt: 3,
    loseCnt: 2,
    useOtp: false,
  };

  const dummyMatchHistory: MatchHistoryProps = {
    myName: username,
    myScore: 4,
    oppName: 'pongmaster',
    oppScore: 10,
  };

  return (
    <VStack>
      <Head>
        <title>{`${username} | LastPong`}</title>
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
        <WinLoseSum winCnt={user.winCnt} loseCnt={user.loseCnt} fontSize="3xl" />
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
      <CustomButton size="xl" onClick={() => {}}>
        ADD FRIEND
      </CustomButton>
    </VStack>
  );
}

UserProfilePage.getLayout = function (page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
