import './globals.css'

export const metadata = {
  title: 'DD Pro — TaxAutomationSuite',
  description: 'Due Diligence Pro — IRS Form 8867 compliance for tax preparers',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  )
}
