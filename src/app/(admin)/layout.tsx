import { notFound } from "next/navigation";
import Header from "@/components/header";
import { getAdmin } from "@/actions/admin.actions";
import { Sidebar } from "./admin/_components/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const response = await getAdmin();

  const isAuthorized = response.data?.authorized && response.data?.user;

  if (!isAuthorized) {
    return notFound();
  }

  return (
    <div className="h-full">
      <Header isAdminPage={true} />
      <div className="flex h-full w-56 flex-col top-20 fixed inset-y-0 z-50">
        <Sidebar />
      </div>
      <main className="md:pl-56 pt-[80px] h-full">{children}</main>
    </div>
  );
}
