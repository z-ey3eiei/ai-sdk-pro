
import type { Metadata } from "next";
import WorkspaceAccount from "../../../components/WorkspaceAccount";
import "../../../components/workspace-account.css";

export const metadata: Metadata = {
  title: "Account and GitHub | ai-sdk.pro",
  description: "Manage your ai-sdk.pro account and separately connect GitHub.",
};
export default function AccountPage() { return <WorkspaceAccount/>; }
