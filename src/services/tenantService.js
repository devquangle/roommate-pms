import { Repository } from '../data/repository.js';
import { TenantBusiness } from '../business/tenantBusiness.js';
import { LOCAL_STORAGE_KEYS } from '../constants/index.js';

const tenantRepository = new Repository(LOCAL_STORAGE_KEYS.TENANTS);
const contractRepository = new Repository(LOCAL_STORAGE_KEYS.CONTRACTS);
const tenantBusiness = new TenantBusiness(tenantRepository, contractRepository);

export const TenantService = {
  getAllTenants: () => tenantBusiness.getAllTenants(),
  getTenantById: (id) => tenantBusiness.getTenantById(id),
  createTenant: (data) => tenantBusiness.createTenant(data),
  updateTenant: (id, data) => tenantBusiness.updateTenant(id, data),
  deleteTenant: (id) => tenantBusiness.deleteTenant(id),
};
