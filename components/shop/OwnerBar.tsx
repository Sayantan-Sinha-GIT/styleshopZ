"use client";

import { SignOut } from "@phosphor-icons/react";

export function OwnerBar({ onSignOut }: { onSignOut?: () => void }) {
  return (
    <header className="owner-bar">
      <div className="owner-bar-brand" aria-label="styleshopZ owner console">
        <span className="owner-bar-mark">Sz</span>
        <span><strong>styleshopZ</strong><small>Owner console</small></span>
      </div>
      {onSignOut && (
        <button className="owner-signout" type="button" onClick={onSignOut}>
          <SignOut size={18} aria-hidden="true" />
          <span>Sign out</span>
        </button>
      )}
    </header>
  );
}
