// A function with no arguments and returns a type.
type F0<RT = void> = () => RT;
// A function that takes an argument and returns a type.
type F1<T, RT = void> = (arg: T) => RT;

// A top-level import would turn this file into a module, so reference the type inline.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AudioSource = import("expo-audio").AudioSource;

interface ILevel {
  id: string;
  title: string;
  modules: ISublevel[];
}

interface ISublevel {
  id: string;
  title: string;
  sections: ISection[];
}

interface ISection {
  id: string;
  icon: string;
  title: string;
  completed: boolean;
  metadata: Metadata;
  activities: IActivity[];
}

interface Option {
  id: string;
  title: string;
}

interface IMetadata {
  description: string;
  keywords: string[];
}

type DynamicModalRefType = {
  showDynamicModal: () => void;
  hideDynamicModal: () => void;
};

interface IOption {
  id: string;
  title: string;
}

interface IActivity {
  id: string;
  numberOfTimesCorrectAnswerGiven: number;
  type: "MATCH_THE_LETTER" | "MATCH_THE_SOUND" | "MATCH_THE_NAME";
  character: string;
  correctAnswer: Option;
  audio: AudioSource;
  options: Option[];
  sound: {
    alphabeticAudioSrc: AudioSource;
    phoneticAudioSrc: AudioSource;
  };
  letter: {
    lowerCase: string;
    upperCase: string;
  };
  animatedLetters?: {
    lowerCase: string;
    upperCase: string;
  };
  letters?: string[];
  progress?: {
    lowercaseReadCount: number;
    uppercaseReadCount: number;
    phoneticSoundPlayCount: number;
    alphabeticSoundPlayCount: number;
  };
  nameAndSoundActivityProgress?: ILetterSoundAndNameProgress;
}

interface IActivityWithSoundAndName {
  id: string;
  numberOfTimesCorrectAnswerGiven: number;
  type: "MATCH_THE_LETTER" | "MATCH_THE_SOUND" | "MATCH_THE_NAME";
  correctAnswer: Option;
  audio: AudioSource;
  options: Option[];
}

interface ILesson {
  id: string;
  svg: any; // TODO: Type of an SVG file...
  title: string;
  description: string;
  path: string;
  isFinished: boolean;
  guidanceAudioKey: string;
}

interface ILetter {
  id: string;
  value: string;
}

interface ILetterIntroductionProgress {
  lowercaseReadCount: number;
  uppercaseReadCount: number;
  phoneticSoundPlayCount: number;
  alphabeticSoundPlayCount: number;
}

interface ILetterSoundAndNameProgress {
  uppercaseSoundCount: number;
  lowercaseSoundCount: number;
}

interface AudioPlayerStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis?: number;
  durationMillis?: number;
  didJustFinish: boolean;
}

interface AudioSection {
  "audio-files": AudioFile | AudioFile[];
}

interface AlphabetModule {
  "letter-introduction": AudioSection;
  "letter-formation": AudioSection;
  "letter-sound": AudioSection;
  "letter-name": AudioSection;
  "letter-matching": AudioSection;
}

interface BlendingModule {
  "blending-introduction": AudioSection;
  "multiple-choice-tab": AudioSection;
  "audio-multiple-choice-tab": AudioSection;
  "spelling-tab": AudioSection;
}

interface ConversationSection {
  "listening-tab": AudioSection;
  // "video-explanation"?: AudioSection;
  "audio-ordering-tab": AudioSection;
}

interface VocabularySection {
  "flashcards-tab": AudioSection;
  // "video-explanation"?: AudioSection;
  "picture-multiple-choice-tab": AudioSection;
  "audio-multiple-choice-tab": AudioSection;
}

interface HomeScreen {
  "teacher-tip": AudioSection;
  "alphabet-module": AudioSection;
  "blending-module": AudioSection;
  "vocabulary-module": AudioSection;
  "conversation-module": AudioSection;
}

type GuidanceMOdule = AlphabetModule | BlendingModule;

interface GuidanceType {
  "home-screen": HomeScreen;
  "alphabet-module": AlphabetModule;
  "blending-module": BlendingModule;
  "vocabulary-module": VocabularySection;
  "conversation-module": ConversationSection;
}
