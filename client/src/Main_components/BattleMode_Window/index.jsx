import { useState, useEffect } from "react";
import HomeBtn from "../HomeBtn";
import BackBtn from "../BackBtn";
import Timer from "./components/timer";
import Round from "./components/round";
import Question from "./components/question_window";
import Multiplier from "./components/multiplier";
import HealthBar from "./components/healthbar";
import WinnerDisplay from "./components/WinnerDisplay";
import RoundScreen from "./components/RoundScreen";
import { calculatePoints } from "./components/pointsystem";
import { generateRandomMultiplier } from "./components/pointsystem";
import {
  CURRENT_QUESTION,
  RESET_IS_ANSWERED,
  BOTH_ANSWERED,
} from "../../graphql/mutations";
import { POLL_GAME } from "../../graphql/queries";
import { useQuery, useMutation } from "@apollo/client";
import { ATTACK } from "../../graphql/mutations";
import { useStore } from "../OptionsProvider"; //GlobalState

const BattleMode = () => {
  const [currentQuestionFE, setCurrentQuestionFE] = useState({
    question: "",
    correctAnswer: "",
    incorrectAnswers: [],
  });
  const [timeLeft, setTimeLeft] = useState(0);
  //const [isAnswered, setIsAnswered] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [answerState, setAnswerState] = useState(null);
  const [playerOneHealth, setPlayerOneHealth] = useState(3000);
  const [playerTwoHealth, setPlayerTwoHealth] = useState(3000);
  const [winner, setWinner] = useState("");
  const [round, setRound] = useState(0);
  const [showRoundScreen, setShowRoundScreen] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  const { state, setMessage } = useStore();

  const [currentQuestion] = useMutation(CURRENT_QUESTION, {
    variables: {
      gameId: state.roomcode,
    },
  });

  const [resetIsAnswered] = useMutation(RESET_IS_ANSWERED, {
    variables: {
      gameId: state.roomcode,
    },
  });

  const [bothAnswered] = useMutation(BOTH_ANSWERED, {
    variables: {
      gameId: state.roomcode,
    },
  });

  const { loading, error, data } = useQuery(POLL_GAME, {
    variables: { gameId: state.roomcode },
    pollInterval: 500,
  });

  const [attack] = useMutation(ATTACK);

  //player 1 queries questions
  const fetchQuestions = async () => {
    if (!loading) {
      if (data.pollGame.playerTwo.player._id === state.user._id) {
        //only player 1 queries API in backend
        currentQuestion();
      }
    }
  };

  useEffect(() => {
    if (!loading) {
      if (data.pollGame.question != null) {
        //make sure poll game has info before setting the current question
        setCurrentQuestionFE({
          question: data.pollGame.question.question,
          correctAnswer: data.pollGame.question.correctAnswer,
          incorrectAnswers: data.pollGame.question.incorrectAnswers,
        });
      }
    }
  }, [data.pollGame]);

  //sets winner when it changes
  useEffect(() => {
    if (!loading) {
      if (data.pollGame.winner !== null) {
        setWinner(data.pollGame.winner);
      }
    }
  }, [data.pollGame.winner]);

  //after intital countdown fetch question and reset everything
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowRoundScreen(true);
      setRound(1)
      resetIsAnswered();
      setAnswerState(null);
      fetchQuestions();
    }
  }, [countdown]);

  //after 5 sec hide the round screen
  useEffect(() => {
    if (showRoundScreen) {
      setMultiplier(generateRandomMultiplier());
      const timer = setTimeout(() => {
        setShowRoundScreen(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showRoundScreen]);

  //sees if any changes to the score and updates UI accordingly
  useEffect(() => {
    if (!loading) {
      const playerOneScore = data.pollGame.playerTwo.score;
      const playerTwoScore = data.pollGame.playerOne.score;
      setPlayerOneHealth(playerTwoScore);
      setPlayerTwoHealth(playerOneScore);
    }
  }, [data.pollGame.playerOne.score, data.pollGame.playerTwo.score]);

  //if both players have answered move on to the next question and reset everything
  useEffect(() => {
    if (!loading) {
      if (
        data.pollGame.isPlayerOneAnswered &&
        data.pollGame.isPlayerTwoAnswered
      ) {
         setTimeout(() => {
          setAnswerState(null); //if there is truthy value in answer state it triggers colors to pop up
          resetIsAnswered();
          fetchQuestions();
          setRound((prevRound) => prevRound + 1);
          setShowRoundScreen(true);
        }, 4000);
      }
    }
  }, [data.pollGame.isPlayerOneAnswered, data.pollGame.isPlayerTwoAnswered]);

  // HANDLE ANSWER SECTION==============================================
  const handleAnswer = async (
    answer,
    correctAnswer,
    timeLeft,
    multiplier,
    setAnswerState,
    fetchQuestions,
    setPlayerOneHealth,
    setPlayerTwoHealth
  ) => {
    //setIsAnswered(true); //pauses timer
    setAnswerState("answered"); // toggles colors when answered

    let points = calculatePoints(timeLeft, multiplier);
    const isCorrect = answer === correctAnswer;

    await attack({
      //Sets points earned damage to other player
      variables: { gameId: state.roomcode, isCorrect, amount: points },
    });

    await bothAnswered(); //checks which player has answered and sets whether they have or not
  };

  // HANDLE ANSWER END=========================================

  return (
    <section className="flex flex-col items-center justify-center h-screen relative">
      {winner ? (
        <WinnerDisplay winner={winner} />
      ) : (
        <>
          {countdown > 0 ? (
            <div className="text-6xl text-white">
              <h1>Game starting in {countdown}...</h1>
            </div>
          ) : (
            <div className="bg-cyan-600 border border-cyan-800 relative bg-opacity-90 shadow-xl rounded-xl max-w-4xl w-full flex flex-col md:flex-row items-start">
              <div className="flex flex-col items-center justify-center absolute left-3 top-1/2 -translate-y-1/2 z-10">
                {!loading && (
                  <HealthBar
                    player={data.pollGame.playerOne.player.username}
                    avatar={data.pollGame.playerOne.player.profile}
                    health={playerOneHealth}
                  />
                )}
              </div>
              {/* <Timer
                timeLeft={timeLeft}
                setTimeLeft={setTimeLeft}
                isAnswered={isAnswered}
                showRoundScreen={showRoundScreen}
              /> */}

              <div className="flex-grow p-5 ">
                <div className="relative flex justify-between items-center mb-5 p-3 bg-cyan-950 rounded-xl mx-16">
                  <Round round={round} />
                  <Multiplier multiplier={multiplier} />
                </div>

                <div className="p-5 bg-cyan-950 rounded-xl flex justify-center mx-16 min-h-80">
                  {showRoundScreen && (
                    <RoundScreen round={round} multiplier={multiplier} />
                  )}
                  {!showRoundScreen && currentQuestionFE && (
                    <Question
                      question={currentQuestionFE.question}
                      options={currentQuestionFE.incorrectAnswers}
                      correctAnswer={currentQuestionFE.correctAnswer}
                      handleAnswer={(answer) =>
                        handleAnswer(
                          answer,
                          currentQuestionFE.correctAnswer,
                          timeLeft,
                          multiplier,
                          //setIsAnswered,
                          setAnswerState,
                          //setPointsEarned,
                          fetchQuestions,
                          setPlayerOneHealth,
                          setPlayerTwoHealth
                        )
                      }
                      answerState={answerState}
                    />
                  )}
                </div>

                <div className="text-white text-xl mt-3 flex justify-between">
                  <div className="text-3xl font-bold">P1: {}</div>

                  {/* <div>{difference}</div>} */}

                  <div className="text-3xl font-bold">{} :P2</div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center absolute right-3 top-1/2 -translate-y-1/2">
                {!loading && (
                  <HealthBar
                    player={data.pollGame.playerTwo.player.username}
                    avatar={data.pollGame.playerTwo.player.profile}
                    health={playerTwoHealth}
                  />
                )}
              </div>
              <div className=" absolute -top-5 -right-5">
                <HomeBtn />
              </div>
              <div className=" absolute -top-5 -left-5">
                <BackBtn />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default BattleMode;
