import React, { useState } from 'react';
import { addCustomerSynced, updateCustomerSynced, type Customer } from '../db';

interface AddCustomerModalProps {
  isOpen: boolean;
  merchantId: string;
  onClose: () => void;
  onSuccess: (newCustomerId: number) => void;
  initialData?: Customer | null;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  merchantId,
  onClose,
  onSuccess,
  initialData
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      if (initialData?.id) {
        await updateCustomerSynced(merchantId, initialData.id, {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
          updatedAt: now
        });
        onSuccess(initialData.id);
      } else {
        const id = await addCustomerSynced(merchantId, {
          name: name.trim(),
          phone: phone.trim() || '+91 ',
          address: address.trim(),
          notes: notes.trim(),
          createdAt: now,
          updatedAt: now
        });
        onSuccess(id);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save customer', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl p-5 border border-[#27272a] bg-[#111318] text-zinc-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a] mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-zinc-900 border border-[#27272a] flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
            </span>
            <h2 className="text-sm font-bold text-white">
              {initialData ? 'Edit Party Profile' : 'Add New Customer Profile'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-[#27272a] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
              Customer / Party Name <span className="text-red-400">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[17px] text-zinc-500 pointer-events-none">
                person
              </span>
              <input
                required
                type="text"
                placeholder="e.g. Dharmesh Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full py-2 pl-9 pr-3 rounded-xl bg-black/60 border border-[#27272a] text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
              Mobile Number (WhatsApp / SMS)
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[17px] text-zinc-500 pointer-events-none">
                phone_iphone
              </span>
              <input
                type="tel"
                placeholder="e.g. +91 98250 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full py-2 pl-9 pr-3 rounded-xl bg-black/60 border border-[#27272a] text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
              Shop Location / Address (Optional)
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[17px] text-zinc-500 pointer-events-none">
                location_on
              </span>
              <input
                type="text"
                placeholder="e.g. Shop 14, Commercial Market"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full py-2 pl-9 pr-3 rounded-xl bg-black/60 border border-[#27272a] text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
              Business Note / Reference
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Kirana supplies client, settles monthly"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-black/60 border border-[#27272a] text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl bg-zinc-900 border border-[#27272a] text-zinc-300 text-xs font-semibold hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-2/3 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>{initialData ? 'Save Changes' : 'Create Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
