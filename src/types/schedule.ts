export type Schedule = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  completed: boolean;
};

export type TimeBlock = "morning" | "afternoon" | "evening";
