import "./globals.css";

export const metadata = {
  title: "Tamining Grove Limited — Maize Inventory v3",
  description: "Strategic edition: break-even, buyer analytics, cash flow forecast"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <nav className="nav">
            <a className="badge" href="/">Dashboard</a>
            <a className="badge" href="/harvest">Add Harvest</a>
            <a className="badge" href="/sale">Record Sale</a>
            <a className="badge" href="/inventory">Inventory</a>
            <a className="badge" href="/costs">Field Costs</a>
            <a className="badge" href="/cashflow">Cash Flow</a>
            <a className="badge" href="/reports">Reports</a>
            <a className="badge" href="/settings">Settings</a>
            <a className="badge" href="/auth">Sign In</a>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
