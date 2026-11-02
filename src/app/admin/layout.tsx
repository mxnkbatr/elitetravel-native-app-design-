import "./admin.css";

/** Marks every admin screen (login included) so the dark command-center theme applies. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div data-admin>{children}</div>;
}
