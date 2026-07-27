'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useUserStore } from '@/store/use-user-store';
import Navbar from '@/components/shared/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, UserPlus, ShieldAlert, ArrowLeft, Loader2,
  Trash2, Check, UserCheck, ShieldClose, Camera, UserX
} from 'lucide-react';

interface StaffProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'owner' | 'admin' | 'super_admin' | 'manager' | 'delivery';
  active: boolean;
  vehicle_type: string | null;
  status: 'active' | 'pending_approval' | 'deactivated';
  avatar_url: string | null;
  created_at: string;
}

export default function TeamManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUserStore();

  // Modal and Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('IPLdhaba123!');
  const [role, setRole] = useState<'owner' | 'admin' | 'super_admin' | 'manager' | 'delivery'>('manager');
  const [vehicleType, setVehicleType] = useState('Bike');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  const [addingMember, setAddingMember] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Guard routing
  useEffect(() => {
    if (!user || user.role !== 'owner') {
      router.push('/admin/login');
    }
  }, [user, router]);

  // Query staff profiles
  const { data, isLoading } = useQuery<{ staff: StaffProfile[] }>({
    queryKey: ['admin-team-members'],
    queryFn: async () => {
      const res = await fetch('/api/admin/team');
      if (!res.ok) throw new Error('Failed to load team list');
      return res.json();
    },
    enabled: !!user && user.role === 'owner',
  });

  const staffList = data?.staff || [];

  // Toggle active / status mutation
  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, active, status }: { id: string; active?: boolean; status?: string }) => {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, status }),
      });
      if (!res.ok) throw new Error('Failed to update staff member');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team-members'] });
    },
  });

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePhoto(e.target.files[0]);
    }
  };

  const uploadDriverPhoto = async (file: File): Promise<string> => {
    const randomPath = `${crypto.randomUUID()}.${file.name.split('.').pop() || 'jpg'}`;
    const filePath = `profiles/${randomPath}`;

    const { error: uploadError } = await supabase.storage
      .from('driver-profiles')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('driver-profiles')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError('Name and Email are required.');
      return;
    }

    setAddingMember(true);
    setFormError(null);

    try {
      let avatarUrl = null;

      if (role === 'delivery' && profilePhoto) {
        setUploadingPhoto(true);
        avatarUrl = await uploadDriverPhoto(profilePhoto);
        setUploadingPhoto(false);
      }

      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          role,
          vehicleType: role === 'delivery' ? vehicleType : null,
          avatarUrl,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add staff member');

      // Reset Form
      setName('');
      setEmail('');
      setPhone('');
      setPassword('IPLdhaba123!');
      setRole('manager');
      setProfilePhoto(null);
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ['admin-team-members'] });
      alert('Staff member registered successfully! 🏏');
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Verify credentials.');
    } finally {
      setAddingMember(false);
      setUploadingPhoto(false);
    }
  };

  const handleDeactivate = (id: string) => {
    if (confirm('Are you sure you want to deactivate this account? They will lose access.')) {
      updateStaffMutation.mutate({ id, active: false, status: 'deactivated' });
    }
  };

  const handleActivate = (id: string, role: string) => {
    const nextStatus = role === 'delivery' ? 'pending_approval' : 'active';
    updateStaffMutation.mutate({ id, active: true, status: nextStatus });
  };

  const handleApproveDriver = (id: string) => {
    updateStaffMutation.mutate({ id, active: true, status: 'active' });
  };

  const getStatusBadge = (member: StaffProfile) => {
    if (!member.active) return <Badge variant="cancelled">Inactive</Badge>;
    if (member.status === 'pending_approval') return <Badge variant="placed">Pending Approve</Badge>;
    return <Badge variant="delivered">Active</Badge>;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream/30 flex flex-col pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 w-full mt-8 flex-1 flex flex-col gap-6">
        
        {/* Navigation & Link Actions */}
        <div className="flex justify-between items-center">
          <Link href="/admin/dashboard" className="text-muted hover:text-saffron text-xs font-bold flex items-center gap-1 w-fit">
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
          <Button
            onClick={() => { setFormError(null); setShowAddModal(true); }}
            className="flex items-center gap-1.5 bg-saffron text-white font-bold text-xs"
          >
            <UserPlus size={14} />
            Onboard Team Member
          </Button>
        </div>

        <h2 className="text-xl font-black text-ink flex items-center gap-2">
          <Users className="text-saffron" />
          IPL Dhaba Team Directory
        </h2>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-saffron" />
            <span className="text-sm font-semibold">Loading crew listing...</span>
          </div>
        ) : staffList.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-lg border border-border">
            <span className="text-4xl">😴</span>
            <h3 className="font-bold text-ink text-sm mt-3">No staff members listed</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {staffList.map((member) => (
              <Card key={member.id} className="bg-surface border-border flex flex-col justify-between shadow-sm">
                <CardContent className="p-5 flex gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-cream border border-border flex-shrink-0 overflow-hidden relative flex items-center justify-center font-bold text-lg text-saffron">
                    {member.avatar_url ? (
                      <Image src={member.avatar_url} alt={member.full_name || 'Staff'} width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                      (member.full_name || 'S').slice(0, 1).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5 text-xs text-ink leading-relaxed">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-extrabold text-ink">{member.full_name || 'Staff Member'}</h4>
                        <span className="text-[10px] text-muted block mt-0.5">{member.email}</span>
                      </div>
                      {getStatusBadge(member)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50">
                      <div>
                        <span className="text-[10px] text-muted block uppercase font-bold tracking-wide">Role</span>
                        <span className="font-semibold text-saffron capitalize">{member.role.replace(/_/g, ' ')}</span>
                      </div>
                      {member.phone && (
                        <div>
                          <span className="text-[10px] text-muted block uppercase font-bold tracking-wide">Phone</span>
                          <span className="font-semibold">{member.phone}</span>
                        </div>
                      )}
                      {member.role === 'delivery' && member.vehicle_type && (
                        <div>
                          <span className="text-[10px] text-muted block uppercase font-bold tracking-wide">Vehicle</span>
                          <span className="font-semibold text-purple-700">{member.vehicle_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>

                {/* Actions Footer */}
                <div className="p-4 bg-cream/15 border-t border-border flex justify-end gap-2">
                  {member.id !== user.id && ( // Prevent self-deactivation
                    <>
                      {/* Driver Approval */}
                      {member.role === 'delivery' && member.status === 'pending_approval' && member.active && (
                        <Button
                          size="sm"
                          onClick={() => handleApproveDriver(member.id)}
                          className="bg-emerald-600 text-white font-bold text-xs py-1.5 flex items-center gap-1"
                        >
                          <UserCheck size={13} />
                          Approve Driver
                        </Button>
                      )}

                      {member.active ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeactivate(member.id)}
                          className="text-xs font-bold py-1.5 bg-red-600 text-white"
                        >
                          <UserX size={13} className="mr-1" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleActivate(member.id, member.role)}
                          className="text-xs font-bold py-1.5 bg-charcoal text-white"
                        >
                          <Check size={13} className="mr-1" />
                          Activate
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Onboard Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-charcoal/50 z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddSubmit} 
            className="bg-white border border-border p-6 rounded-lg shadow-premium max-w-md w-full flex flex-col gap-4 overflow-y-auto max-h-[90vh]"
          >
            <h3 className="font-extrabold text-ink text-base border-b border-border pb-2">
              Onboard Dhaba Staff / Rider 🏏
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-muted mb-1">Full Name *</label>
              <Input
                type="text"
                placeholder="e.g. Suresh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted mb-1">Email Address *</label>
              <Input
                type="email"
                placeholder="e.g. suresh@ipldhaba.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-muted mb-1">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="e.g. +919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted mb-1">Password *</label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-muted mb-1.5">Assign Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-border bg-white rounded focus:outline-none focus:ring-1 focus:ring-saffron"
                >
                  <option value="manager">Staff / Manager</option>
                  <option value="admin">Dhaba Admin</option>
                  <option value="delivery">Delivery Rider</option>
                  <option value="owner">Dhaba Owner</option>
                </select>
              </div>

              {role === 'delivery' && (
                <div>
                  <label className="block text-[10px] font-bold text-muted mb-1.5">Vehicle Type *</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full text-xs p-2.5 border border-border bg-white rounded focus:outline-none focus:ring-1 focus:ring-saffron"
                  >
                    <option value="Bike">Motor Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Cycle">Bicycle</option>
                    <option value="Car">Car</option>
                  </select>
                </div>
              )}
            </div>

            {/* Profile Photo Upload for Drivers */}
            {role === 'delivery' && (
              <div>
                <label className="block text-[10px] font-bold text-muted mb-1">Profile Photo Upload</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="text-xs text-ink block w-full cursor-pointer bg-cream rounded border border-border p-2"
                />
                {profilePhoto && (
                  <span className="text-[10px] text-green-700 font-semibold block mt-1">
                    ✓ Selected: {profilePhoto.name}
                  </span>
                )}
              </div>
            )}

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2 rounded">
                ⚠️ {formError}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-border mt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-white border border-border text-ink hover:bg-cream text-xs font-bold py-2.5 rounded shadow-sm"
              >
                Cancel
              </button>
              <Button
                type="submit"
                isLoading={addingMember || uploadingPhoto}
                className="flex-1 bg-saffron text-white font-bold text-xs py-2.5"
              >
                Onboard Member
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
