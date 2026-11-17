export type ContentId = number | string;

export type ContentUser = Omit<API.UserVO, "id"> & { id?: ContentId };

export type QuestionContent = Omit<API.QuestionVO, "id" | "user"> & {
  id?: ContentId;
  user?: ContentUser;
  tags?: string;
  answer?: string;
};

export interface ContentPage<T> {
  records?: T[];
  total?: number | string;
  current?: number | string;
  size?: number | string;
}

export type QuestionBankContent = Omit<API.QuestionBankVO, "id" | "questionPage" | "user"> & {
  id?: ContentId;
  user?: ContentUser;
  questionPage?: ContentPage<QuestionContent>;
  description?: string;
  picture?: string;
};

export type ContentSearchParams = Record<string, string | string[] | undefined>;
