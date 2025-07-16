import React from 'react';
import { PortalHeader } from '@/components/portal/portal-header'; // Import the header
import './portal-globals.css'; // Import portal-specific global styles

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nested layouts should not include <html> or <body> tags.
  // These are handled by the root app/layout.tsx.
  return (
    // This div becomes the root element returned by this layout component.
    // The body's background (from app/globals.css or app/layout.tsx) will be the backdrop.
    // This div then creates the portal's specific visual area.
    <div className="min-h-screen bg-gray-50 portal-scope flex flex-col"> {/* Added flex flex-col */}
      <PortalHeader />
      {/* The {children} will be the content of app/portal/page.tsx */}
      {children}
      {/* You can add a public footer here if needed */}
    </div>
  );
}