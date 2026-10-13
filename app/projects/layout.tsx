import { LikesProvider } from "@/components/projects/LikesProvider";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <LikesProvider>{children}</LikesProvider>;
}
