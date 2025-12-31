import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { getAllUsers, updateUserRole, revokeUserAccess, deleteUser, MODERATOR_PERMISSIONS, getUserRoles, addUserRole, removeUserRole } from '../../utils/adminUtils';
import { supabase } from '../../config/supabaseClient';
import { DEPOSIT_METHODS } from '../../utils/depositMethods';
import './AdminPanel.css';

export default function AdminPanel() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  
  // Offer Card Builder State
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'offers', or 'thelife'
  const [offers, setOffers] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerFormData, setOfferFormData] = useState({
    casino_name: '',
    title: '',
    image_url: '',
    bonus_link: '',
    badge: '',
    badge_class: '',
    min_deposit: '',
    cashback: '',
    bonus_value: '',
    free_spins: '',
    deposit_methods: '',
    vpn_friendly: false,
    is_premium: false,
    details: '',
    is_active: true,
    display_order: 0
  });

  // The Life Management State
  const [theLifeTab, setTheLifeTab] = useState('crimes'); // 'crimes', 'businesses', 'items', 'workers'
  const [crimes, setCrimes] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [items, setItems] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [showCrimeModal, setShowCrimeModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [editingCrime, setEditingCrime] = useState(null);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingWorker, setEditingWorker] = useState(null);
  const [crimeFormData, setCrimeFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    min_level_required: 1,
    ticket_cost: 1,
    base_reward: 100,
    max_reward: 500,
    success_rate: 50,
    jail_time_minutes: 30,
    hp_loss_on_fail: 10,
    xp_reward: 10
  });
  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    type: 'item',
    icon: '📦',
    rarity: 'common',
    tradeable: false
  });
  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    cost: 500,
    profit: 1500,
    duration_minutes: 30,
    min_level_required: 1,
    is_active: true
  });
  const [workerFormData, setWorkerFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    hire_cost: 1000,
    income_per_hour: 100,
    rarity: 'common',
    min_level_required: 1,
    is_active: true
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    loadUsers();
    loadOffers();
    loadCrimes();
    loadBusinesses();
    loadItems();
    loadWorkers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await getAllUsers();
    
    if (error) {
      setError('Failed to load users: ' + error.message);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId, role, expiresAt, moderatorPermissions = null) => {
    setError('');
    setSuccess('');
    
    const { error } = await updateUserRole(userId, role, expiresAt, moderatorPermissions);
    
    if (error) {
      setError('Failed to update role: ' + error.message);
    } else {
      setSuccess('User role updated successfully!');
      setEditingUser(null);
      loadUsers();
    }
  };

  const handleRevokeAccess = async (userId) => {
    if (!confirm('Are you sure you want to revoke access for this user?')) return;
    
    setError('');
    setSuccess('');
    
    const { error } = await revokeUserAccess(userId);
    
    if (error) {
      setError('Failed to revoke access: ' + error.message);
    } else {
      setSuccess('User access revoked successfully!');
      loadUsers();
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to DELETE this user? This cannot be undone!')) return;
    
    setError('');
    setSuccess('');
    
    const { error } = await deleteUser(userId);
    
    if (error) {
      setError('Failed to delete user: ' + error.message);
    } else {
      setSuccess('User deleted successfully!');
      loadUsers();
    }
  };

  const openEditModal = (user) => {
    setEditingUser({
      ...user,
      newRole: '',
      newRoleExpiryDays: '',
      newRoleModeratorPermissions: {}
    });
  };

  const handleAddRole = async () => {
    if (!editingUser || !editingUser.newRole) return;
    
    setError('');
    setSuccess('');
    
    let expiresAt = null;
    if (editingUser.newRoleExpiryDays && editingUser.newRoleExpiryDays > 0) {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(editingUser.newRoleExpiryDays));
      expiresAt = date.toISOString();
    }
    
    const moderatorPerms = editingUser.newRole === 'moderator' ? editingUser.newRoleModeratorPermissions : null;
    
    const { error } = await addUserRole(editingUser.id, editingUser.newRole, expiresAt, moderatorPerms);
    
    if (error) {
      setError('Failed to add role: ' + error.message);
    } else {
      setSuccess('Role added successfully!');
      loadUsers();
      setEditingUser({
        ...editingUser,
        newRole: '',
        newRoleExpiryDays: '',
        newRoleModeratorPermissions: {}
      });
    }
  };

  const handleRemoveRole = async (roleToRemove) => {
    if (!editingUser) return;
    if (!confirm(`Are you sure you want to remove the ${roleToRemove} role from this user?`)) return;
    
    setError('');
    setSuccess('');
    
    const { error } = await removeUserRole(editingUser.id, roleToRemove);
    
    if (error) {
      setError('Failed to remove role: ' + error.message);
    } else {
      setSuccess('Role removed successfully!');
      loadUsers();
    }
  };

  const toggleModeratorPermission = (permission) => {
    if (!editingUser) return;
    
    setEditingUser({
      ...editingUser,
      newRoleModeratorPermissions: {
        ...editingUser.newRoleModeratorPermissions,
        [permission]: !editingUser.newRoleModeratorPermissions[permission]
      }
    });
  };

  // ===== OFFER CARD MANAGEMENT FUNCTIONS =====
  
  const loadOffers = async () => {
    const { data, error } = await supabase
      .from('casino_offers')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error loading offers:', error);
    } else {
      setOffers(data || []);
    }
  };

  const openOfferModal = (offer = null) => {
    if (offer) {
      setOfferFormData(offer);
      setEditingOffer(offer);
    } else {
      setOfferFormData({
        casino_name: '',
        title: '',
        image_url: '',
        bonus_link: '',
        badge: '',
        badge_class: '',
        min_deposit: '',
        cashback: '',
        bonus_value: '',
        free_spins: '',
        is_premium: false,
        details: '',
        is_active: true,
        display_order: offers.length
      });
      setEditingOffer(null);
    }
    setShowOfferModal(true);
  };

  const closeOfferModal = () => {
    setShowOfferModal(false);
    setEditingOffer(null);
    setOfferFormData({
      casino_name: '',
      title: '',
      image_url: '',
      bonus_link: '',
      badge: '',
      badge_class: '',
      min_deposit: '',
      cashback: '',
      bonus_value: '',
      free_spins: '',
      deposit_methods: '',
      vpn_friendly: false,
      is_premium: false,
      details: '',
      is_active: true,
      display_order: 0
    });
  };

  const handleOfferFormChange = (field, value) => {
    setOfferFormData({ ...offerFormData, [field]: value });
  };

  const saveOffer = async () => {
    setError('');
    setSuccess('');

    if (!offerFormData.casino_name || !offerFormData.title || !offerFormData.image_url) {
      setError('Please fill in required fields: Casino Name, Title, and Image URL');
      return;
    }

    try {
      if (editingOffer) {
        // Update existing offer
        const { error } = await supabase
          .from('casino_offers')
          .update(offerFormData)
          .eq('id', editingOffer.id);

        if (error) throw error;
        setSuccess('Offer updated successfully!');
      } else {
        // Create new offer
        const { error } = await supabase
          .from('casino_offers')
          .insert([{ ...offerFormData, created_by: (await supabase.auth.getUser()).data.user?.id }]);

        if (error) throw error;
        setSuccess('Offer created successfully!');
      }

      closeOfferModal();
      loadOffers();
    } catch (err) {
      setError('Failed to save offer: ' + err.message);
    }
  };

  const deleteOffer = async (offerId) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('casino_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      setSuccess('Offer deleted successfully!');
      loadOffers();
    } catch (err) {
      setError('Failed to delete offer: ' + err.message);
    }
  };

  // === THE LIFE MANAGEMENT FUNCTIONS ===
  
  const loadCrimes = async () => {
    const { data, error } = await supabase
      .from('the_life_robberies')
      .select('*')
      .order('min_level_required', { ascending: true });
    
    if (error) {
      console.error('Error loading crimes:', error);
    } else {
      setCrimes(data || []);
    }
  };

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error loading items:', error);
    } else {
      setItems(data || []);
    }
  };

  const openCrimeModal = (crime = null) => {
    if (crime) {
      setCrimeFormData({
        name: crime.name,
        description: crime.description || '',
        image_url: crime.image_url || '',
        min_level_required: crime.min_level_required,
        ticket_cost: crime.ticket_cost,
        base_reward: crime.base_reward,
        max_reward: crime.max_reward,
        success_rate: crime.success_rate,
        jail_time_minutes: crime.jail_time_minutes,
        hp_loss_on_fail: crime.hp_loss_on_fail,
        xp_reward: crime.xp_reward
      });
      setEditingCrime(crime);
    } else {
      setCrimeFormData({
        name: '',
        description: '',
        image_url: '',
        min_level_required: 1,
        ticket_cost: 1,
        base_reward: 100,
        max_reward: 500,
        success_rate: 50,
        jail_time_minutes: 30,
        hp_loss_on_fail: 10,
        xp_reward: 10
      });
      setEditingCrime(null);
    }
    setShowCrimeModal(true);
  };

  const closeCrimeModal = () => {
    setShowCrimeModal(false);
    setEditingCrime(null);
  };

  const saveCrime = async () => {
    setError('');
    setSuccess('');

    if (!crimeFormData.name) {
      setError('Crime name is required');
      return;
    }

    try {
      if (editingCrime) {
        const { error } = await supabase
          .from('the_life_robberies')
          .update(crimeFormData)
          .eq('id', editingCrime.id);

        if (error) throw error;
        setSuccess('Crime updated successfully!');
      } else {
        const { error } = await supabase
          .from('the_life_robberies')
          .insert([crimeFormData]);

        if (error) throw error;
        setSuccess('Crime created successfully!');
      }

      closeCrimeModal();
      loadCrimes();
    } catch (err) {
      setError('Failed to save crime: ' + err.message);
    }
  };

  const deleteCrime = async (crimeId) => {
    if (!confirm('Are you sure you want to delete this crime?')) return;

    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('the_life_robberies')
        .delete()
        .eq('id', crimeId);

      if (error) throw error;
      setSuccess('Crime deleted successfully!');
      loadCrimes();
    } catch (err) {
      setError('Failed to delete crime: ' + err.message);
    }
  };

  const toggleCrimeActive = async (crime) => {
    try {
      const { error } = await supabase
        .from('the_life_robberies')
        .update({ is_active: !crime.is_active })
        .eq('id', crime.id);

      if (error) throw error;
      setSuccess(`Crime ${!crime.is_active ? 'activated' : 'deactivated'} successfully!`);
      loadCrimes();
    } catch (err) {
      setError('Failed to toggle crime: ' + err.message);
    }
  };

  // Business Management Functions
  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_businesses')
        .select('*')
        .order('min_level_required', { ascending: true });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      console.error('Error loading businesses:', err);
    }
  };

  const openBusinessModal = (business = null) => {
    if (business) {
      setBusinessFormData({
        name: business.name,
        description: business.description || '',
        image_url: business.image_url || '',
        cost: business.cost,
        profit: business.profit,
        duration_minutes: business.duration_minutes,
        min_level_required: business.min_level_required,
        is_active: business.is_active
      });
      setEditingBusiness(business);
    } else {
      setBusinessFormData({
        name: '',
        description: '',
        image_url: '',
        cost: 500,
        profit: 1500,
        duration_minutes: 30,
        min_level_required: 1,
        is_active: true
      });
      setEditingBusiness(null);
    }
    setShowBusinessModal(true);
  };

  const closeBusinessModal = () => {
    setShowBusinessModal(false);
    setEditingBusiness(null);
  };

  const saveBusiness = async () => {
    setError('');
    setSuccess('');

    if (!businessFormData.name) {
      setError('Business name is required');
      return;
    }

    try {
      if (editingBusiness) {
        const { error } = await supabase
          .from('the_life_businesses')
          .update(businessFormData)
          .eq('id', editingBusiness.id);

        if (error) throw error;
        setSuccess('Business updated successfully!');
      } else {
        const { error } = await supabase
          .from('the_life_businesses')
          .insert([businessFormData]);

        if (error) throw error;
        setSuccess('Business created successfully!');
      }

      closeBusinessModal();
      loadBusinesses();
    } catch (err) {
      setError('Failed to save business: ' + err.message);
    }
  };

  const deleteBusiness = async (businessId) => {
    if (!confirm('Are you sure you want to delete this business?')) return;

    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('the_life_businesses')
        .delete()
        .eq('id', businessId);

      if (error) throw error;
      setSuccess('Business deleted successfully!');
      loadBusinesses();
    } catch (err) {
      setError('Failed to delete business: ' + err.message);
    }
  };

  const toggleBusinessActive = async (business) => {
    try {
      const { error } = await supabase
        .from('the_life_businesses')
        .update({ is_active: !business.is_active })
        .eq('id', business.id);

      if (error) throw error;
      setSuccess(`Business ${!business.is_active ? 'activated' : 'deactivated'} successfully!`);
      loadBusinesses();
    } catch (err) {
      setError('Failed to toggle business: ' + err.message);
    }
  };

  const openItemModal = (item = null) => {
    if (item) {
      setItemFormData({
        name: item.name,
        description: item.description || '',
        type: item.type,
        icon: item.icon,
        rarity: item.rarity,
        tradeable: item.tradeable || false
      });
      setEditingItem(item);
    } else {
      setItemFormData({
        name: '',
        description: '',
        type: 'item',
        icon: '📦',
        rarity: 'common',
        tradeable: false
      });
      setEditingItem(null);
    }
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setEditingItem(null);
  };

  const saveItem = async () => {
    setError('');
    setSuccess('');

    if (!itemFormData.name || !itemFormData.icon) {
      setError('Item name and icon are required');
      return;
    }

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update(itemFormData)
          .eq('id', editingItem.id);

        if (error) throw error;
        setSuccess('Item updated successfully!');
      } else {
        const { error } = await supabase
          .from('items')
          .insert([itemFormData]);

        if (error) throw error;
        setSuccess('Item created successfully!');
      }

      closeItemModal();
      loadItems();
    } catch (err) {
      setError('Failed to save item: ' + err.message);
    }
  };

  const deleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setSuccess('Item deleted successfully!');
      loadItems();
    } catch (err) {
      setError('Failed to delete item: ' + err.message);
    }
  };

  // === BROTHEL WORKERS MANAGEMENT ===
  
  const loadWorkers = async () => {
    const { data, error } = await supabase
      .from('the_life_brothel_workers')
      .select('*')
      .order('rarity', { ascending: true })
      .order('hire_cost', { ascending: true });
    
    if (error) {
      console.error('Error loading workers:', error);
    } else {
      setWorkers(data || []);
    }
  };

  const openWorkerModal = (worker = null) => {
    if (worker) {
      setWorkerFormData({
        name: worker.name,
        description: worker.description || '',
        image_url: worker.image_url || '',
        hire_cost: worker.hire_cost,
        income_per_hour: worker.income_per_hour,
        rarity: worker.rarity,
        min_level_required: worker.min_level_required,
        is_active: worker.is_active
      });
      setEditingWorker(worker);
    } else {
      setWorkerFormData({
        name: '',
        description: '',
        image_url: '',
        hire_cost: 1000,
        income_per_hour: 100,
        rarity: 'common',
        min_level_required: 1,
        is_active: true
      });
      setEditingWorker(null);
    }
    setShowWorkerModal(true);
  };

  const closeWorkerModal = () => {
    setShowWorkerModal(false);
    setEditingWorker(null);
  };

  const saveWorker = async () => {
    setError('');
    setSuccess('');

    if (!workerFormData.name) {
      setError('Worker name is required');
      return;
    }

    try {
      if (editingWorker) {
        const { error } = await supabase
          .from('the_life_brothel_workers')
          .update(workerFormData)
          .eq('id', editingWorker.id);

        if (error) throw error;
        setSuccess('Worker updated successfully!');
      } else {
        const { error } = await supabase
          .from('the_life_brothel_workers')
          .insert([workerFormData]);

        if (error) throw error;
        setSuccess('Worker created successfully!');
      }

      closeWorkerModal();
      loadWorkers();
    } catch (err) {
      setError('Failed to save worker: ' + err.message);
    }
  };

  const deleteWorker = async (workerId) => {
    if (!confirm('Are you sure you want to delete this worker?')) return;

    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('the_life_brothel_workers')
        .delete()
        .eq('id', workerId);

      if (error) throw error;
      setSuccess('Worker deleted successfully!');
      loadWorkers();
    } catch (err) {
      setError('Failed to delete worker: ' + err.message);
    }
  };

  const toggleWorkerActive = async (workerId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('the_life_brothel_workers')
        .update({ is_active: !currentStatus })
        .eq('id', workerId);

      if (error) throw error;
      loadWorkers();
    } catch (err) {
      setError('Failed to toggle worker status: ' + err.message);
    }
  };

  const toggleOfferActive = async (offerId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('casino_offers')
        .update({ is_active: !currentStatus })
        .eq('id', offerId);

      if (error) throw error;
      loadOffers();
    } catch (err) {
      setError('Failed to toggle offer status: ' + err.message);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="admin-panel-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🛡️ Admin Panel</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Management
        </button>
        <button 
          className={`admin-tab ${activeTab === 'offers' ? 'active' : ''}`}
          onClick={() => setActiveTab('offers')}
        >
          🎰 Casino Offers
        </button>
        <button 
          className={`admin-tab ${activeTab === 'thelife' ? 'active' : ''}`}
          onClick={() => setActiveTab('thelife')}
        >
          🔫 The Life Management
        </button>
      </div>

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <>
          <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.roles?.some(r => r.role === 'admin')).length}</div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.roles?.some(r => r.role === 'slot_modder')).length}</div>
          <div className="stat-label">Slot Modders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.roles?.some(r => r.role === 'moderator')).length}</div>
          <div className="stat-label">Moderators</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.roles?.some(r => r.role === 'premium')).length}</div>
          <div className="stat-label">Premium</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.is_active).length}</div>
          <div className="stat-label">Active Users</div>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Provider</th>
              <th>Role</th>
              <th>Status</th>
              <th>Access Expires</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users
              .slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)
              .map(user => (
              <tr key={user.id} className={!user.is_active ? 'inactive-user' : ''}>
                <td>{user.email}</td>
                <td>
                  <div className="provider-info">
                    <span className={`provider-badge provider-${user.provider?.toLowerCase()}`}>
                      {user.provider || 'Email'}
                    </span>
                    {user.provider_username && (
                      <span className="provider-username">@{user.provider_username}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="user-roles-container">
                    {(user.roles || []).map((roleObj, idx) => (
                      <span key={idx} className={`role-badge role-${roleObj.role}`}>
                        {roleObj.role}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className={`status-dot ${user.is_active ? 'active' : 'inactive'}`} 
                       title={user.is_active ? 'Active' : 'Inactive'}>
                  </div>
                </td>
                <td>
                  {user.roles?.some(r => r.access_expires_at) ? (
                    <div className="expiry-dates-container">
                      {user.roles.filter(r => r.access_expires_at).map((roleObj, idx) => (
                        <span key={idx} className="expiry-date">
                          {roleObj.role}: {new Date(roleObj.access_expires_at).toLocaleDateString()}
                          {new Date(roleObj.access_expires_at) < new Date() && ' (Expired)'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="no-expiry">No Limit</span>
                  )}
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => openEditModal(user)} 
                      className="btn-edit"
                      title="Edit user"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleRevokeAccess(user.id)} 
                      className="btn-revoke"
                      title="Revoke access"
                      disabled={!user.is_active}
                    >
                      🚫
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)} 
                      className="btn-delete"
                      title="Delete user"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {users.length > usersPerPage && (
        <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {Math.ceil(users.length / usersPerPage)}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(users.length / usersPerPage), prev + 1))}
            disabled={currentPage === Math.ceil(users.length / usersPerPage)}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Manage User Roles</h2>
            <div className="modal-body">
              <div className="form-group">
                <label>Email</label>
                <input type="text" value={editingUser.email} disabled />
              </div>

              {/* Current Roles */}
              <div className="form-group">
                <label>Current Roles</label>
                <div className="current-roles-list">
                  {(editingUser.roles || []).map((roleObj, idx) => (
                    <div key={idx} className="current-role-item">
                      <span className={`role-badge role-${roleObj.role}`}>
                        {roleObj.role}
                      </span>
                      {roleObj.access_expires_at && (
                        <span className="role-expiry">
                          Expires: {new Date(roleObj.access_expires_at).toLocaleDateString()}
                        </span>
                      )}
                      <button 
                        onClick={() => handleRemoveRole(roleObj.role)} 
                        className="btn-remove-role"
                        title="Remove role"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {(!editingUser.roles || editingUser.roles.length === 0) && (
                    <span className="no-roles">No roles assigned</span>
                  )}
                </div>
              </div>

              {/* Add New Role */}
              <div className="form-group add-role-section">
                <label>Add New Role</label>
                <select 
                  value={editingUser.newRole}
                  onChange={(e) => setEditingUser({...editingUser, newRole: e.target.value, newRoleModeratorPermissions: {}})}
                >
                  <option value="">-- Select Role --</option>
                  <option value="user">User (No Overlay Access)</option>
                  <option value="premium">Premium (Overlay Only)</option>
                  <option value="slot_modder">Slot Modder (Slot Management)</option>
                  <option value="moderator">Moderator (Overlay + Custom Admin)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              {/* Moderator Permissions for new moderator role */}
              {editingUser.newRole === 'moderator' && (
                <div className="form-group moderator-permissions">
                  <label>Moderator Permissions</label>
                  <div className="permissions-grid">
                    {Object.entries(MODERATOR_PERMISSIONS).map(([key, description]) => (
                      <label key={key} className="permission-checkbox">
                        <input
                          type="checkbox"
                          checked={!!editingUser.newRoleModeratorPermissions[key]}
                          onChange={() => toggleModeratorPermission(key)}
                        />
                        <div className="permission-info">
                          <span className="permission-name">{key.replace(/_/g, ' ').toUpperCase()}</span>
                          <span className="permission-desc">{description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {editingUser.newRole && (
                <div className="form-group">
                  <label>Access Duration (days)</label>
                  <input 
                    type="number" 
                    placeholder="Leave empty for unlimited"
                    value={editingUser.newRoleExpiryDays}
                    onChange={(e) => setEditingUser({...editingUser, newRoleExpiryDays: e.target.value})}
                    min="0"
                  />
                  <small>Set how many days from today the access expires. Leave empty for unlimited.</small>
                </div>
              )}

              {editingUser.newRole && (
                <button onClick={handleAddRole} className="btn-add-role">
                  Add Role
                </button>
              )}

              <div className="modal-actions">
                <button onClick={() => setEditingUser(null)} className="btn-cancel">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Casino Offers Tab */}
      {activeTab === 'offers' && (
        <div className="offers-management">
          <div className="offers-header">
            <h2>Casino Offer Cards</h2>
            <button onClick={() => openOfferModal()} className="btn-create-offer">
              ➕ Create New Offer
            </button>
          </div>

          <div className="offers-grid">
            {offers.map((offer) => (
              <div key={offer.id} className={`offer-admin-card ${!offer.is_active ? 'inactive' : ''}`}>
                <div className="offer-admin-image">
                  <img src={offer.image_url} alt={offer.casino_name} />
                  {offer.badge && (
                    <span className={`offer-badge ${offer.badge_class}`}>{offer.badge}</span>
                  )}
                  {!offer.is_active && (
                    <div className="inactive-overlay">INACTIVE</div>
                  )}
                </div>
                <div className="offer-admin-content">
                  <h3>{offer.casino_name}</h3>
                  <p className="offer-title">{offer.title}</p>
                  <div className="offer-stats">
                    <span>💰 {offer.min_deposit}</span>
                    <span>💸 {offer.cashback}</span>
                    <span>🎁 {offer.bonus_value}</span>
                  </div>
                  <div className="offer-admin-actions">
                    <button 
                      onClick={() => openOfferModal(offer)}
                      className="btn-edit-offer"
                      title="Edit offer"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => toggleOfferActive(offer.id, offer.is_active)}
                      className={`btn-toggle-offer ${offer.is_active ? 'active' : ''}`}
                      title={offer.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {offer.is_active ? '👁️ Active' : '🚫 Inactive'}
                    </button>
                    <button 
                      onClick={() => deleteOffer(offer.id)}
                      className="btn-delete-offer"
                      title="Delete offer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {offers.length === 0 && (
            <div className="no-offers">
              <p>No casino offers yet. Create your first offer!</p>
            </div>
          )}
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="modal-overlay" onClick={closeOfferModal}>
          <div className="modal-content offer-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingOffer ? 'Edit Casino Offer' : 'Create New Casino Offer'}</h2>
            <div className="modal-body offer-form">
              <div className="offer-form-split">
                <div className="offer-form-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Casino Name *</label>
                      <input
                        type="text"
                        value={offerFormData.casino_name}
                        onChange={(e) => handleOfferFormChange('casino_name', e.target.value)}
                        placeholder="e.g., Ignibet"
                      />
                    </div>

                    <div className="form-group">
                      <label>Bonus Link *</label>
                      <input
                        type="text"
                        value={offerFormData.bonus_link}
                        onChange={(e) => handleOfferFormChange('bonus_link', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={offerFormData.title}
                      onChange={(e) => handleOfferFormChange('title', e.target.value)}
                      placeholder="e.g., 665% Bonus & 750 FS up to €6250"
                    />
                  </div>

                  <div className="form-group">
                    <label>Image URL *</label>
                    <input
                      type="text"
                      value={offerFormData.image_url}
                      onChange={(e) => handleOfferFormChange('image_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Badge Text</label>
                      <input
                        type="text"
                        value={offerFormData.badge}
                        onChange={(e) => handleOfferFormChange('badge', e.target.value)}
                        placeholder="HOT, NEW, etc."
                      />
                    </div>

                    <div className="form-group">
                      <label>Badge Class</label>
                      <select
                        value={offerFormData.badge_class}
                        onChange={(e) => handleOfferFormChange('badge_class', e.target.value)}
                      >
                        <option value="">None</option>
                        <option value="hot">Hot</option>
                        <option value="new">New</option>
                        <option value="exclusive">Exclusive</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row form-row-4">
                    <div className="form-group">
                      <label>Min Deposit</label>
                      <input
                        type="text"
                        value={offerFormData.min_deposit}
                        onChange={(e) => handleOfferFormChange('min_deposit', e.target.value)}
                        placeholder="20€"
                      />
                    </div>

                    <div className="form-group">
                      <label>Cashback</label>
                      <input
                        type="text"
                        value={offerFormData.cashback}
                        onChange={(e) => handleOfferFormChange('cashback', e.target.value)}
                        placeholder="30%"
                      />
                    </div>

                    <div className="form-group">
                      <label>Bonus Value</label>
                      <input
                        type="text"
                        value={offerFormData.bonus_value}
                        onChange={(e) => handleOfferFormChange('bonus_value', e.target.value)}
                        placeholder="665%"
                      />
                    </div>

                    <div className="form-group">
                      <label>Free Spins</label>
                      <input
                        type="text"
                        value={offerFormData.free_spins}
                        onChange={(e) => handleOfferFormChange('free_spins', e.target.value)}
                        placeholder="Up to 750"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Details / Terms</label>
                      <textarea
                        value={offerFormData.details}
                        onChange={(e) => handleOfferFormChange('details', e.target.value)}
                        placeholder="+18 | T&C APPLY&#10;&#10;Enter full terms and conditions..."
                        rows="2"
                      />
                    </div>

                    <div className="form-group">
                      <label>Deposit Methods</label>
                      <div className="deposit-methods-grid">
                        {DEPOSIT_METHODS.map(method => {
                          const selectedMethods = offerFormData.deposit_methods ? offerFormData.deposit_methods.split(',').map(m => m.trim()) : [];
                          const isSelected = selectedMethods.includes(method.id);
                          
                          return (
                            <label key={method.id} className="deposit-method-checkbox">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  let methods = selectedMethods.filter(m => m);
                                  if (e.target.checked) {
                                    methods.push(method.id);
                                  } else {
                                    methods = methods.filter(m => m !== method.id);
                                  }
                                  handleOfferFormChange('deposit_methods', methods.join(','));
                                }}
                              />
                              <span className="method-icon">{method.icon}</span>
                              <span className="method-name">{method.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Display Order</label>
                      <input
                        type="number"
                        value={offerFormData.display_order}
                        onChange={(e) => handleOfferFormChange('display_order', parseInt(e.target.value))}
                        min="0"
                        style={{marginBottom: '8px'}}
                      />
                      <div className="checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={offerFormData.is_premium}
                            onChange={(e) => handleOfferFormChange('is_premium', e.target.checked)}
                          />
                          Premium
                        </label>

                        <label>
                          <input
                            type="checkbox"
                            checked={offerFormData.vpn_friendly}
                            onChange={(e) => handleOfferFormChange('vpn_friendly', e.target.checked)}
                          />
                          ✅ VPN Friendly
                        </label>

                        <label>
                          <input
                            type="checkbox"
                            checked={offerFormData.is_active}
                            onChange={(e) => handleOfferFormChange('is_active', e.target.checked)}
                          />
                          Active
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="offer-preview">
                  <h3>Live Preview</h3>
                  <div className="casino-card preview">
                    <div className="casino-image-container">
                      {offerFormData.badge && (
                        <span className={`casino-badge ${offerFormData.badge_class}`}>
                          {offerFormData.badge}
                        </span>
                      )}
                      <img 
                        src={offerFormData.image_url || 'https://via.placeholder.com/400x300'} 
                        alt={offerFormData.casino_name || 'Preview'} 
                        className="casino-image"
                      />
                    </div>
                    <div className="casino-content">
                      <h3 className="casino-name">{offerFormData.casino_name || 'Casino Name'}</h3>
                      <p className="casino-offer">{offerFormData.title || 'Offer Title'}</p>
                      <div className="casino-details">
                        <div className="detail-item">
                          <span className="detail-label">Min Deposit</span>
                          <span className="detail-value">{offerFormData.min_deposit || '-'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Cashback</span>
                          <span className="detail-value">{offerFormData.cashback || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={saveOffer} className="btn-save">
                  {editingOffer ? 'Update Offer' : 'Create Offer'}
                </button>
                <button onClick={closeOfferModal} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* The Life Management Tab */}
      {activeTab === 'thelife' && (
        <>
          <div className="thelife-management">
            <div className="thelife-header">
              <h2>🔫 The Life Game Management</h2>
              <p>Manage crimes, businesses, items, and brothel content for The Life RPG</p>
            </div>

            {/* Sub-tabs for The Life */}
            <div className="thelife-tabs">
              <button 
                className={`thelife-tab ${theLifeTab === 'crimes' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('crimes')}
              >
                💰 Crimes
              </button>
              <button 
                className={`thelife-tab ${theLifeTab === 'businesses' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('businesses')}
              >
                💼 Businesses
              </button>
              <button 
                className={`thelife-tab ${theLifeTab === 'items' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('items')}
              >
                🎒 Items
              </button>
              <button 
                className={`thelife-tab ${theLifeTab === 'workers' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('workers')}
              >
                💃 Brothel Workers
              </button>
            </div>

            {/* Crimes Section */}
            {theLifeTab === 'crimes' && (
              <div className="crimes-management">
                <div className="section-header">
                  <h3>💰 Crime Management</h3>
                  <button onClick={() => openCrimeModal()} className="btn-primary">
                    ➕ Add New Crime
                  </button>
                </div>

                <div className="crimes-grid">
                  {crimes.map(crime => (
                    <div key={crime.id} className="crime-admin-card">
                      <div className="crime-preview-image">
                        {crime.image_url ? (
                          <img src={crime.image_url} alt={crime.name} />
                        ) : (
                          <div className="no-image">No Image</div>
                        )}
                        {!crime.is_active && (
                          <div className="inactive-badge">INACTIVE</div>
                        )}
                      </div>
                      <div className="crime-info">
                        <h4>{crime.name}</h4>
                        <p className="crime-desc">{crime.description}</p>
                        <div className="crime-stats-grid">
                          <div className="stat">
                            <span className="label">Level</span>
                            <span className="value">{crime.min_level_required}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Tickets</span>
                            <span className="value">{crime.ticket_cost}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Success</span>
                            <span className="value">{crime.success_rate}%</span>
                          </div>
                          <div className="stat">
                            <span className="label">Reward</span>
                            <span className="value">${crime.base_reward}-${crime.max_reward}</span>
                          </div>
                          <div className="stat">
                            <span className="label">XP</span>
                            <span className="value">{crime.xp_reward}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Jail Time</span>
                            <span className="value">{crime.jail_time_minutes}m</span>
                          </div>
                        </div>
                      </div>
                      <div className="crime-actions">
                        <button 
                          onClick={() => toggleCrimeActive(crime)} 
                          className={`btn-toggle ${crime.is_active ? 'active' : 'inactive'}`}
                        >
                          {crime.is_active ? '✓ Active' : '✗ Inactive'}
                        </button>
                        <button onClick={() => openCrimeModal(crime)} className="btn-edit">
                          ✏️ Edit
                        </button>
                        <button onClick={() => deleteCrime(crime.id)} className="btn-delete">
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Businesses Section */}
            {theLifeTab === 'businesses' && (
              <div className="businesses-management">
                <div className="section-header">
                  <h3>💼 Business Management</h3>
                  <button onClick={() => openBusinessModal()} className="btn-primary">
                    ➕ Add New Business
                  </button>
                </div>

                <div className="businesses-grid">
                  {businesses.map(business => (
                    <div key={business.id} className="business-admin-card">
                      <div className="business-preview-image">
                        {business.image_url ? (
                          <img src={business.image_url} alt={business.name} />
                        ) : (
                          <div className="no-image">No Image</div>
                        )}
                        {!business.is_active && (
                          <div className="inactive-badge">INACTIVE</div>
                        )}
                      </div>
                      <div className="business-info">
                        <h4>{business.name}</h4>
                        <p className="business-desc">{business.description}</p>
                        <div className="business-stats-grid">
                          <div className="stat">
                            <span className="label">Cost</span>
                            <span className="value">${business.cost.toLocaleString()}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Profit</span>
                            <span className="value">${business.profit.toLocaleString()}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Duration</span>
                            <span className="value">{business.duration_minutes}m</span>
                          </div>
                          <div className="stat">
                            <span className="label">Min Level</span>
                            <span className="value">{business.min_level_required}</span>
                          </div>
                        </div>
                      </div>
                      <div className="business-actions">
                        <button 
                          onClick={() => toggleBusinessActive(business)} 
                          className={`btn-toggle ${business.is_active ? 'active' : 'inactive'}`}
                        >
                          {business.is_active ? '✓ Active' : '✗ Inactive'}
                        </button>
                        <button onClick={() => openBusinessModal(business)} className="btn-edit">
                          ✏️ Edit
                        </button>
                        <button onClick={() => deleteBusiness(business.id)} className="btn-delete">
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items Section */}
            {theLifeTab === 'items' && (
              <div className="items-management">
                <div className="section-header">
                  <h3>🎒 Item Management</h3>
                  <button onClick={() => openItemModal()} className="btn-primary">
                    ➕ Add New Item
                  </button>
                </div>

                <div className="items-grid">
                  {items.map(item => (
                    <div key={item.id} className="item-admin-card">
                      <div className="item-icon-large">{item.icon}</div>
                      <div className="item-info">
                        <h4>{item.name}</h4>
                        <p className="item-desc">{item.description}</p>
                        <div className="item-meta">
                          <span className={`item-type ${item.type}`}>{item.type}</span>
                          <span className={`item-rarity ${item.rarity}`}>{item.rarity}</span>
                          {item.tradeable && <span className="item-tradeable">Tradeable</span>}
                        </div>
                      </div>
                      <div className="item-actions">
                        <button onClick={() => openItemModal(item)} className="btn-edit">
                          ✏️ Edit
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="btn-delete">
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Brothel Workers Section */}
            {theLifeTab === 'workers' && (
              <div className="workers-management">
                <div className="section-header">
                  <h3>💃 Brothel Workers Management</h3>
                  <button onClick={() => openWorkerModal()} className="btn-primary">
                    ➕ Add New Worker
                  </button>
                </div>

                <div className="workers-grid">
                  {workers.map(worker => (
                    <div key={worker.id} className="worker-admin-card">
                      <div className="worker-preview-image">
                        {worker.image_url ? (
                          <img src={worker.image_url} alt={worker.name} />
                        ) : (
                          <div className="no-image">No Image</div>
                        )}
                        {!worker.is_active && (
                          <div className="inactive-badge">INACTIVE</div>
                        )}
                      </div>
                      <div className="worker-info">
                        <h4>{worker.name}</h4>
                        <p className="worker-desc">{worker.description}</p>
                        <div className="worker-stats-grid">
                          <div className="stat">
                            <span className="label">Hire Cost</span>
                            <span className="value">${worker.hire_cost.toLocaleString()}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Income/Hour</span>
                            <span className="value">${worker.income_per_hour}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Min Level</span>
                            <span className="value">{worker.min_level_required}</span>
                          </div>
                          <div className="stat full-width">
                            <span className={`rarity-badge ${worker.rarity}`}>{worker.rarity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="worker-actions">
                        <button 
                          onClick={() => toggleWorkerActive(worker.id, worker.is_active)} 
                          className={`btn-toggle ${worker.is_active ? 'active' : 'inactive'}`}
                        >
                          {worker.is_active ? '✓ Active' : '✗ Inactive'}
                        </button>
                        <button onClick={() => openWorkerModal(worker)} className="btn-edit">
                          ✏️ Edit
                        </button>
                        <button onClick={() => deleteWorker(worker.id)} className="btn-delete">
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Crime Modal */}
          {showCrimeModal && (
            <div className="modal-overlay" onClick={closeCrimeModal}>
              <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingCrime ? 'Edit Crime' : 'Add New Crime'}</h2>
                  <button onClick={closeCrimeModal} className="modal-close">×</button>
                </div>

                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Crime Name *</label>
                      <input
                        type="text"
                        value={crimeFormData.name}
                        onChange={(e) => setCrimeFormData({...crimeFormData, name: e.target.value})}
                        placeholder="e.g., Bank Heist"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Description</label>
                      <textarea
                        value={crimeFormData.description}
                        onChange={(e) => setCrimeFormData({...crimeFormData, description: e.target.value})}
                        placeholder="Describe the crime..."
                        rows="3"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Image URL</label>
                      <input
                        type="text"
                        value={crimeFormData.image_url}
                        onChange={(e) => setCrimeFormData({...crimeFormData, image_url: e.target.value})}
                        placeholder="https://images.unsplash.com/..."
                      />
                      {crimeFormData.image_url && (
                        <div className="image-preview">
                          <img src={crimeFormData.image_url} alt="Preview" />
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Min Level Required</label>
                      <input
                        type="number"
                        value={crimeFormData.min_level_required}
                        onChange={(e) => setCrimeFormData({...crimeFormData, min_level_required: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>

                    <div className="form-group">
                      <label>Ticket Cost</label>
                      <input
                        type="number"
                        value={crimeFormData.ticket_cost}
                        onChange={(e) => setCrimeFormData({...crimeFormData, ticket_cost: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>

                    <div className="form-group">
                      <label>Base Reward ($)</label>
                      <input
                        type="number"
                        value={crimeFormData.base_reward}
                        onChange={(e) => setCrimeFormData({...crimeFormData, base_reward: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Max Reward ($)</label>
                      <input
                        type="number"
                        value={crimeFormData.max_reward}
                        onChange={(e) => setCrimeFormData({...crimeFormData, max_reward: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Success Rate (%)</label>
                      <input
                        type="number"
                        value={crimeFormData.success_rate}
                        onChange={(e) => setCrimeFormData({...crimeFormData, success_rate: parseInt(e.target.value)})}
                        min="0"
                        max="100"
                      />
                    </div>

                    <div className="form-group">
                      <label>Jail Time (minutes)</label>
                      <input
                        type="number"
                        value={crimeFormData.jail_time_minutes}
                        onChange={(e) => setCrimeFormData({...crimeFormData, jail_time_minutes: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>HP Loss on Fail</label>
                      <input
                        type="number"
                        value={crimeFormData.hp_loss_on_fail}
                        onChange={(e) => setCrimeFormData({...crimeFormData, hp_loss_on_fail: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>XP Reward</label>
                      <input
                        type="number"
                        value={crimeFormData.xp_reward}
                        onChange={(e) => setCrimeFormData({...crimeFormData, xp_reward: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={saveCrime} className="btn-save">
                    {editingCrime ? 'Update Crime' : 'Create Crime'}
                  </button>
                  <button onClick={closeCrimeModal} className="btn-cancel">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Business Modal */}
          {showBusinessModal && (
            <div className="modal-overlay" onClick={closeBusinessModal}>
              <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingBusiness ? 'Edit Business' : 'Add New Business'}</h2>
                  <button onClick={closeBusinessModal} className="modal-close">×</button>
                </div>

                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Business Name *</label>
                      <input
                        type="text"
                        value={businessFormData.name}
                        onChange={(e) => setBusinessFormData({...businessFormData, name: e.target.value})}
                        placeholder="e.g., Weed Farm"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Description</label>
                      <textarea
                        value={businessFormData.description}
                        onChange={(e) => setBusinessFormData({...businessFormData, description: e.target.value})}
                        placeholder="Describe the business..."
                        rows="3"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Image URL</label>
                      <input
                        type="text"
                        value={businessFormData.image_url}
                        onChange={(e) => setBusinessFormData({...businessFormData, image_url: e.target.value})}
                        placeholder="https://images.unsplash.com/..."
                      />
                      {businessFormData.image_url && (
                        <div className="image-preview">
                          <img src={businessFormData.image_url} alt="Preview" />
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Cost ($)</label>
                      <input
                        type="number"
                        value={businessFormData.cost}
                        onChange={(e) => setBusinessFormData({...businessFormData, cost: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Profit ($)</label>
                      <input
                        type="number"
                        value={businessFormData.profit}
                        onChange={(e) => setBusinessFormData({...businessFormData, profit: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Duration (minutes)</label>
                      <input
                        type="number"
                        value={businessFormData.duration_minutes}
                        onChange={(e) => setBusinessFormData({...businessFormData, duration_minutes: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>

                    <div className="form-group">
                      <label>Min Level Required</label>
                      <input
                        type="number"
                        value={businessFormData.min_level_required}
                        onChange={(e) => setBusinessFormData({...businessFormData, min_level_required: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={businessFormData.is_active}
                          onChange={(e) => setBusinessFormData({...businessFormData, is_active: e.target.checked})}
                        />
                        Is Active
                      </label>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={saveBusiness} className="btn-save">
                    {editingBusiness ? 'Update Business' : 'Create Business'}
                  </button>
                  <button onClick={closeBusinessModal} className="btn-cancel">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Item Modal */}
          {showItemModal && (
            <div className="modal-overlay" onClick={closeItemModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
                  <button onClick={closeItemModal} className="modal-close">×</button>
                </div>

                <div className="modal-body">
                  <div className="form-group">
                    <label>Item Name *</label>
                    <input
                      type="text"
                      value={itemFormData.name}
                      onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
                      placeholder="e.g., Golden Trophy"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={itemFormData.description}
                      onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})}
                      placeholder="Describe the item..."
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Icon (Emoji) *</label>
                    <input
                      type="text"
                      value={itemFormData.icon}
                      onChange={(e) => setItemFormData({...itemFormData, icon: e.target.value})}
                      placeholder="🏆"
                      maxLength="4"
                    />
                  </div>

                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={itemFormData.type}
                      onChange={(e) => setItemFormData({...itemFormData, type: e.target.value})}
                    >
                      <option value="item">Item</option>
                      <option value="achievement">Achievement</option>
                      <option value="badge">Badge</option>
                      <option value="skin">Skin</option>
                      <option value="weapon">Weapon</option>
                      <option value="armor">Armor</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Rarity</label>
                    <select
                      value={itemFormData.rarity}
                      onChange={(e) => setItemFormData({...itemFormData, rarity: e.target.value})}
                    >
                      <option value="common">Common</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Epic</option>
                      <option value="legendary">Legendary</option>
                    </select>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={itemFormData.tradeable}
                        onChange={(e) => setItemFormData({...itemFormData, tradeable: e.target.checked})}
                      />
                      <span>Tradeable</span>
                    </label>
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={saveItem} className="btn-save">
                    {editingItem ? 'Update Item' : 'Create Item'}
                  </button>
                  <button onClick={closeItemModal} className="btn-cancel">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Worker Modal */}
          {showWorkerModal && (
            <div className="modal-overlay" onClick={closeWorkerModal}>
              <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingWorker ? 'Edit Worker' : 'Add New Worker'}</h2>
                  <button onClick={closeWorkerModal} className="modal-close">×</button>
                </div>

                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Worker Name *</label>
                      <input
                        type="text"
                        value={workerFormData.name}
                        onChange={(e) => setWorkerFormData({...workerFormData, name: e.target.value})}
                        placeholder="e.g., Diamond, Sapphire"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Description</label>
                      <textarea
                        value={workerFormData.description}
                        onChange={(e) => setWorkerFormData({...workerFormData, description: e.target.value})}
                        placeholder="Describe this worker..."
                        rows="3"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Image URL</label>
                      <input
                        type="text"
                        value={workerFormData.image_url}
                        onChange={(e) => setWorkerFormData({...workerFormData, image_url: e.target.value})}
                        placeholder="https://images.unsplash.com/..."
                      />
                      {workerFormData.image_url && (
                        <div className="image-preview">
                          <img src={workerFormData.image_url} alt="Preview" />
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Hire Cost ($)</label>
                      <input
                        type="number"
                        value={workerFormData.hire_cost}
                        onChange={(e) => setWorkerFormData({...workerFormData, hire_cost: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Income Per Hour ($)</label>
                      <input
                        type="number"
                        value={workerFormData.income_per_hour}
                        onChange={(e) => setWorkerFormData({...workerFormData, income_per_hour: parseInt(e.target.value)})}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Min Level Required</label>
                      <input
                        type="number"
                        value={workerFormData.min_level_required}
                        onChange={(e) => setWorkerFormData({...workerFormData, min_level_required: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>

                    <div className="form-group">
                      <label>Rarity</label>
                      <select
                        value={workerFormData.rarity}
                        onChange={(e) => setWorkerFormData({...workerFormData, rarity: e.target.value})}
                      >
                        <option value="common">Common</option>
                        <option value="rare">Rare</option>
                        <option value="epic">Epic</option>
                        <option value="legendary">Legendary</option>
                      </select>
                    </div>

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={workerFormData.is_active}
                          onChange={(e) => setWorkerFormData({...workerFormData, is_active: e.target.checked})}
                        />
                        <span>Active (visible to players)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={saveWorker} className="btn-save">
                    {editingWorker ? 'Update Worker' : 'Create Worker'}
                  </button>
                  <button onClick={closeWorkerModal} className="btn-cancel">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
