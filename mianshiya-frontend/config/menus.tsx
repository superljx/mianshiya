import { BookOutlined, HomeOutlined, QuestionCircleOutlined, SettingOutlined } from "@ant-design/icons";
import type { MenuDataItem } from "@ant-design/pro-components";
import ACCESS_ENUM from "../src/access/accessEnum";

export const menus: MenuDataItem[] = [
  { path: "/", name: "主页", icon: <HomeOutlined /> },
  { path: "/banks", name: "题库", icon: <BookOutlined /> },
  { path: "/questions", name: "题目", icon: <QuestionCircleOutlined /> },
  { path: "https://www.mianshiya.com", name: "面试鸭", target: "_blank" },
  {
    path: "/admin", name: "管理", icon: <SettingOutlined />, access: ACCESS_ENUM.ADMIN,
    children: [
      { path: "/admin/user", name: "用户管理", access: ACCESS_ENUM.ADMIN },
      { path: "/admin/bank", name: "题库管理", access: ACCESS_ENUM.ADMIN },
      { path: "/admin/question", name: "题目管理", access: ACCESS_ENUM.ADMIN },
    ],
  },
];
