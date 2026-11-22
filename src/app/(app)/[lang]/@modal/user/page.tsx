import type { ReactNode } from "react";
import { UserCentre } from "./_components/UserCentre";

/**
 * The `@modal` slot's user-centre route. Opening the user centre navigates to
 * `/[lang]/user`, rendering this modal over the app shell, mirroring the venue
 * detail route. Closing it returns through history (see `closeUser`).
 */
export default function ModalUserPage(): ReactNode {
  return <UserCentre />;
}
