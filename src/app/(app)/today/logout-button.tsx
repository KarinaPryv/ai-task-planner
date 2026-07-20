"use client";

import { useLogout } from "@/features/auth/hooks/useLogout";

export default function LogoutButton() {
  const logout = useLogout();

  return (
    <button
      type="button"
      onClick={logout}
      className="mt-6 rounded-md border px-4 py-2"
    >
      Вийти
    </button>
  );
}
