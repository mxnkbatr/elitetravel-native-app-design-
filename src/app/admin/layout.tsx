import "./admin.css";

/** Marks every admin screen (login included) so the admin helpers in admin.css apply. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div data-admin>{children}</div>;
}
