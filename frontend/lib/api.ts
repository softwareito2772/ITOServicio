import axios from 'axios';

const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000/api`)
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('company');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: { name?: string; email?: string; password?: string }) =>
    api.put('/auth/me', data),
};

export const usersAPI = {
  getAll: (skip = 0, limit = 100) =>
    api.get(`/users?skip=${skip}&limit=${limit}`),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: { email: string; password: string; name: string; role: string }) =>
    api.post('/users', data),
  update: (id: number, data: { name?: string; email?: string; role?: string }) =>
    api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

export const clientsAPI = {
  getAll: (skip = 0, limit = 100, search?: string) =>
    api.get(`/clients?skip=${skip}&limit=${limit}${search ? `&search=${search}` : ''}`),
  getInactive: (skip = 0, limit = 100) =>
    api.get(`/clients/inactive?skip=${skip}&limit=${limit}`),
  getById: (id: number) => api.get(`/clients/${id}`),
  create: (data: { name: string; phone: string; email?: string; address?: string; notes?: string }) =>
    api.post('/clients', data),
  update: (id: number, data: { name?: string; phone?: string; email?: string; address?: string; notes?: string }) =>
    api.put(`/clients/${id}`, data),
  delete: (id: number) => api.delete(`/clients/${id}`),
  getEquipment: (id: number) => api.get(`/clients/${id}/equipment`),
};

export const categoriesAPI = {
  getAll: (type?: string) => api.get(`/categories${type ? `?type=${type}` : ''}`),
  getById: (id: number) => api.get(`/categories/${id}`),
  create: (data: { name: string; type: string; description?: string }) =>
    api.post('/categories', data),
  update: (id: number, data: { name?: string; description?: string }) =>
    api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

export const productsAPI = {
  getAll: (skip = 0, limit = 100, search?: string, categoryId?: number, lowStock?: boolean) => {
    let url = `/products?skip=${skip}&limit=${limit}`;
    if (search) url += `&search=${search}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    if (lowStock) url += `&low_stock=true`;
    return api.get(url);
  },
  getLowStock: () => api.get('/products/low-stock'),
  getById: (id: number) => api.get(`/products/${id}`),
  create: (data: FormData) => api.post('/products', data),
  update: (id: number, data: FormData) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
  uploadImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/products/${id}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const inventoryAPI = {
  getMovements: (skip = 0, limit = 100, productId?: number) => {
    let url = `/inventory?skip=${skip}&limit=${limit}`;
    if (productId) url += `&product_id=${productId}`;
    return api.get(url);
  },
  createMovement: (data: { product_id: number; quantity: number; movement_type: string; reason?: string }) =>
    api.post('/inventory', data),
  getProductHistory: (productId: number) => api.get(`/inventory/product/${productId}/history`),
};

export const salesAPI = {
  getAll: (skip = 0, limit = 100, clientId?: number, startDate?: string, endDate?: string) => {
    let url = `/sales?skip=${skip}&limit=${limit}`;
    if (clientId) url += `&client_id=${clientId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return api.get(url);
  },
  getById: (id: number) => api.get(`/sales/${id}`),
  create: (data: { client_id: number; items: { product_id: number; quantity: number; unit_price: number }[]; notes?: string }) =>
    api.post('/sales', data),
  update: (id: number, data: { status?: string; notes?: string }) =>
    api.put(`/sales/${id}`, data),
  delete: (id: number) => api.delete(`/sales/${id}`),
};

export const equipmentAPI = {
  getAll: (skip = 0, limit = 100, clientId?: number, categoryId?: number, status?: string, search?: string) => {
    let url = `/equipment?skip=${skip}&limit=${limit}`;
    if (clientId) url += `&client_id=${clientId}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    if (status) url += `&status=${status}`;
    if (search) url += `&search=${search}`;
    return api.get(url);
  },
  getById: (id: number) => api.get(`/equipment/${id}`),
  create: (data: FormData) => api.post('/equipment', data),
  update: (id: number, data: FormData | Record<string, any>) => api.put(`/equipment/${id}`, data),
  delete: (id: number) => api.delete(`/equipment/${id}`),
  getClientHistory: (clientId: number) => api.get(`/equipment/client/${clientId}/history`),
};

export const maintenanceAPI = {
  getAll: (skip = 0, limit = 100, equipmentId?: number, technicianId?: number, status?: string) => {
    let url = `/maintenance?skip=${skip}&limit=${limit}`;
    if (equipmentId) url += `&equipment_id=${equipmentId}`;
    if (technicianId) url += `&technician_id=${technicianId}`;
    if (status) url += `&status=${status}`;
    return api.get(url);
  },
  getById: (id: number) => api.get(`/maintenance/${id}`),
  create: (data: FormData) => api.post('/maintenance', data),
  update: (id: number, data: FormData) => api.put(`/maintenance/${id}`, data),
  delete: (id: number) => api.delete(`/maintenance/${id}`),
  addImage: (id: number, imageUrl: string, imageType: string, caption?: string) =>
    api.post(`/maintenance/${id}/images`, { image_url: imageUrl, image_type: imageType, caption }),
};

export const repairsAPI = {
  getAll: (skip = 0, limit = 100, equipmentId?: number, technicianId?: number, status?: string) => {
    let url = `/repairs?skip=${skip}&limit=${limit}`;
    if (equipmentId) url += `&equipment_id=${equipmentId}`;
    if (technicianId) url += `&technician_id=${technicianId}`;
    if (status) url += `&status=${status}`;
    return api.get(url);
  },
  getById: (id: number) => api.get(`/repairs/${id}`),
  create: (data: FormData) => api.post('/repairs', data),
  update: (id: number, data: FormData) => api.put(`/repairs/${id}`, data),
  delete: (id: number) => api.delete(`/repairs/${id}`),
  addImage: (id: number, imageUrl: string, imageType: string, caption?: string) =>
    api.post(`/repairs/${id}/images`, { image_url: imageUrl, image_type: imageType, caption }),
};

export const warrantiesAPI = {
  getAll: (skip = 0, limit = 100, status?: string) => {
    let url = `/warranties?skip=${skip}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    return api.get(url);
  },
  getById: (id: number) => api.get(`/warranties/${id}`),
  create: (data: { equipment_id: number; repair_id?: number; warranty_type: string; start_date?: string; end_date?: string; notes?: string }) =>
    api.post('/warranties', data),
  update: (id: number, data: { warranty_type?: string; end_date?: string; status?: string; notes?: string }) =>
    api.put(`/warranties/${id}`, data),
  delete: (id: number) => api.delete(`/warranties/${id}`),
  getByEquipment: (equipmentId: number) => api.get(`/warranties/equipment/${equipmentId}`),
};

export const arrivalStatusesAPI = {
  getAll: () => api.get('/arrival-statuses'),
  getById: (id: number) => api.get(`/arrival-statuses/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/arrival-statuses', data),
  update: (id: number, data: { name?: string; description?: string }) => api.put(`/arrival-statuses/${id}`, data),
  delete: (id: number) => api.delete(`/arrival-statuses/${id}`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};

export const companiesAPI = {
  getAll: () => api.get('/companies/'),
  getById: (id: number) => api.get(`/companies/${id}`),
  getMyCompany: () => api.get('/companies/my/company'),
  create: (data: any) => api.post('/companies/', data),
  update: (id: number, data: any) => api.put(`/companies/${id}`, data),
  updateModules: (id: number, modules: string[]) => api.put(`/companies/${id}/modules`, { modules }),
  getAvailableModules: () => api.get('/companies/available-modules'),
  getUsers: (id: number) => api.get(`/companies/${id}/users`),
  updateMySettings: (data: any) => api.put('/companies/my/settings', data),
  updateMyModules: (modules: string[]) => api.put('/companies/my/modules', { modules }),
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/companies/upload-logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadMyLogo: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/companies/my/upload-logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const workshopAPI = {
  getOrders: (status?: string, type?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('order_type', type);
    const query = params.toString();
    return api.get('/workshop/' + (query ? `?${query}` : ''));
  },
  getOrder: (id: number) => api.get(`/workshop/${id}`),
  createOrder: (data: any) => api.post('/workshop/', data),
  updateOrder: (id: number, data: any) => api.put(`/workshop/${id}`, data),
  addPartsToOrder: (orderId: number, parts: any[]) => api.post(`/workshop/${orderId}/parts`, parts),
  deletePartUsed: (partId: number) => api.delete(`/workshop/parts/${partId}`),
  deleteOrder: (id: number, reason: string) => api.delete(`/workshop/${id}`, { params: { cancel_reason: reason } }),
  getStats: () => api.get('/workshop/summary/stats'),
  getVehicles: (search?: string, type?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type) params.append('vehicle_type', type);
    const query = params.toString();
    return api.get('/workshop/vehicles' + (query ? `?${query}` : ''));
  },
  getVehicle: (id: number) => api.get(`/workshop/vehicles/${id}`),
  createVehicle: (data: any) => api.post('/workshop/vehicles', data),
  updateVehicle: (id: number, data: any) => api.put(`/workshop/vehicles/${id}`, data),
  deleteVehicle: (id: number) => api.delete(`/workshop/vehicles/${id}`),
  getVehicleHistory: (id: number) => api.get(`/workshop/vehicles/${id}/history`),
  getChecklistTemplate: (vehicleType: string) => api.get(`/workshop/checklist-templates/${vehicleType}`),
  createChecklistTemplate: (data: any) => api.post('/workshop/checklist-templates', data),
  deleteChecklistTemplate: (id: number) => api.delete(`/workshop/checklist-templates/${id}`),
  addChecklistItems: (orderId: number, items: any[]) => api.post(`/workshop/${orderId}/checklist`, items),
  getDailyReport: (date?: string) => api.get('/workshop/daily-report' + (date ? `?report_date=${date}` : '')),
  getMechanics: () => api.get('/workshop/mechanics'),
  createMechanic: (data: any) => api.post('/workshop/mechanics', data),
  updateMechanic: (id: number, data: any) => api.put(`/workshop/mechanics/${id}`, data),
  deleteMechanic: (id: number) => api.delete(`/workshop/mechanics/${id}`),
  getInspections: (orderId: number) => api.get(`/workshop/inspections/${orderId}`),
  createInspection: (data: any) => api.post('/workshop/inspections', data),
  addInspectionImage: (inspectionId: number, data: any) => api.post(`/workshop/inspections/${inspectionId}/images`, data),
  deleteInspection: (id: number) => api.delete(`/workshop/inspections/${id}`),
  getInspectionPDF: (orderId: number) => `${API_URL}/workshop/inspections/${orderId}/pdf`,
  getOrderImages: (orderId: number) => api.get(`/workshop/orders/${orderId}/images`),
  addOrderImage: (orderId: number, data: any) => api.post(`/workshop/orders/${orderId}/images`, data),
  deleteOrderImage: (imageId: number) => api.delete(`/workshop/orders/images/${imageId}`),
  getInventory: (params?: { search?: string; category?: string; low_stock?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.low_stock) searchParams.append('low_stock', 'true');
    const q = searchParams.toString();
    return api.get('/workshop/inventory' + (q ? `?${q}` : ''));
  },
  createInventoryItem: (data: any) => api.post('/workshop/inventory', data),
  updateInventoryItem: (id: number, data: any) => api.put(`/workshop/inventory/${id}`, data),
  deleteInventoryItem: (id: number) => api.delete(`/workshop/inventory/${id}`),
  getInventoryStats: () => api.get('/workshop/inventory/stats'),
  searchInventory: (q: string) => api.get(`/workshop/inventory/search?q=${encodeURIComponent(q)}`),
  getInvoices: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return api.get('/workshop/invoices' + q);
  },
  createInvoice: (data: any) => api.post('/workshop/invoices', data),
  updateInvoice: (id: number, data: any) => api.put(`/workshop/invoices/${id}`, data),
  deleteInvoice: (id: number) => api.delete(`/workshop/invoices/${id}`),
  getInvoiceStats: () => api.get('/workshop/invoices/stats'),
};

export const reportsAPI = {
  getSales: (startDate?: string, endDate?: string, clientId?: number) => {
    let url = '/reports/sales';
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (clientId) params.append('client_id', clientId.toString());
    const query = params.toString();
    return api.get(url + (query ? `?${query}` : ''));
  },
  getMaintenance: (startDate?: string, endDate?: string, technicianId?: number, status?: string) => {
    let url = '/reports/maintenance';
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (technicianId) params.append('technician_id', technicianId.toString());
    if (status) params.append('status', status);
    const query = params.toString();
    return api.get(url + (query ? `?${query}` : ''));
  },
  getRepairs: (startDate?: string, endDate?: string, technicianId?: number, status?: string) => {
    let url = '/reports/repairs';
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (technicianId) params.append('technician_id', technicianId.toString());
    if (status) params.append('status', status);
    const query = params.toString();
    return api.get(url + (query ? `?${query}` : ''));
  },
  getInventory: () => api.get('/reports/inventory'),
  getInactiveClients: (months = 6) => api.get(`/reports/clients/inactive?months=${months}`),
  getEquipmentHistory: (clientId: number) => api.get(`/reports/equipment/${clientId}/history`),
  exportReport: (type: string, startDate?: string, endDate?: string) => {
    let url = `/reports/export/${type}`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString();
    return `${API_URL}${url}${query ? `?${query}` : ''}`;
  },
};

export default api;
