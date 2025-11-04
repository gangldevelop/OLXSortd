import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContactWithAnalysis } from '../types/contact';

type SnoozeMap = Record<string, string>;

export function useContactsFilter(allContacts: ContactWithAnalysis[]) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredContacts, setFilteredContacts] = useState<ContactWithAnalysis[]>([]);
  const [snoozedUntilByEmail, setSnoozedUntilByEmail] = useState<SnoozeMap>({});

  const loadSnoozes = () => {
    try {
      const raw = localStorage.getItem('olx_snoozed_until');
      return raw ? (JSON.parse(raw) as SnoozeMap) : {};
    } catch {
      return {} as SnoozeMap;
    }
  };

  const saveSnoozes = (map: SnoozeMap) => {
    localStorage.setItem('olx_snoozed_until', JSON.stringify(map));
  };

  useEffect(() => {
    setSnoozedUntilByEmail(loadSnoozes());
  }, []);

  const isEmailSnoozed = useCallback((email: string) => {
    const iso = snoozedUntilByEmail[email];
    if (!iso) return false;
    return new Date(iso).getTime() > Date.now();
  }, [snoozedUntilByEmail]);

  const baseContacts = useMemo(() => {
    return selectedCategory
      ? allContacts.filter((contact) => contact.category === selectedCategory)
      : allContacts;
  }, [allContacts, selectedCategory]);

  const visibleContacts = useMemo(() => {
    return baseContacts.filter((c) => 
      !isEmailSnoozed(c.email) && 
      !(c.tags || []).includes('crossware') && 
      !(c.tags || []).includes('reseller')
    );
  }, [baseContacts, isEmailSnoozed]);

  useEffect(() => {
    setFilteredContacts(visibleContacts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allContacts, selectedCategory, snoozedUntilByEmail]);

  const handleSnoozeContact = useCallback((contact: ContactWithAnalysis, days: number) => {
    const until = new Date();
    until.setDate(until.getDate() + days);
    const updated = { ...snoozedUntilByEmail, [contact.email]: until.toISOString() };
    setSnoozedUntilByEmail(updated);
    saveSnoozes(updated);
    setFilteredContacts((prev) => prev.filter((c) => c.email !== contact.email));
  }, [snoozedUntilByEmail]);

  // no globals; consumers should call handleSnoozeContact

  const handleCategoryClick = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  return {
    selectedCategory,
    setSelectedCategory,
    filteredContacts,
    setFilteredContacts,
    visibleContacts,
    baseContacts,
    handleCategoryClick,
    handleSnoozeContact,
  };
}


