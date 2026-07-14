import { generateId, getCurrentISODate } from '../utils/index.js';

export class TenantBusiness {
  constructor(tenantRepository, contractRepository = null) {
    this.tenantRepository = tenantRepository;
    this.contractRepository = contractRepository;
  }

  getAllTenants() {
    return this.tenantRepository.getAll();
  }

  getTenantById(id) {
    return this.tenantRepository.getById(id);
  }

  createTenant(tenantData) {
    this.validateTenantData(tenantData);
    
    const existingTenants = this.tenantRepository.getAll();
    if (existingTenants.some(t => t.idCard === tenantData.idCard)) {
      throw new Error('TENANT-01: Số CCCD/CMND đã tồn tại trong hệ thống.');
    }

    const newTenant = {
      id: generateId('t-'),
      fullName: tenantData.fullName.trim(),
      phone: tenantData.phone.trim(),
      idCard: tenantData.idCard.trim(),
      email: tenantData.email ? tenantData.email.trim() : '',
      address: tenantData.address ? tenantData.address.trim() : '',
      createdAt: getCurrentISODate(),
      updatedAt: getCurrentISODate()
    };

    return this.tenantRepository.insert(newTenant);
  }

  updateTenant(id, tenantData) {
    const existingTenant = this.tenantRepository.getById(id);
    if (!existingTenant) throw new Error('Người thuê không tồn tại.');

    this.validateTenantData(tenantData);

    const existingTenants = this.tenantRepository.getAll();
    if (existingTenants.some(t => t.id !== id && t.idCard === tenantData.idCard)) {
      throw new Error('TENANT-01: Số CCCD/CMND đã tồn tại trong hệ thống.');
    }

    const updatedData = {
      fullName: tenantData.fullName.trim(),
      phone: tenantData.phone.trim(),
      idCard: tenantData.idCard.trim(),
      email: tenantData.email ? tenantData.email.trim() : '',
      address: tenantData.address ? tenantData.address.trim() : '',
      updatedAt: getCurrentISODate()
    };

    return this.tenantRepository.update(id, updatedData);
  }

  deleteTenant(id) {
    const existingTenant = this.tenantRepository.getById(id);
    if (!existingTenant) throw new Error('Người thuê không tồn tại.');

    if (this.contractRepository) {
      const contracts = this.contractRepository.getAll();
      const hasActiveContract = contracts.some(c => c.tenantId === id && c.status === 'active');
      if (hasActiveContract) {
         throw new Error('TENANT-03: Không thể xóa người thuê đang có hợp đồng hiệu lực.');
      }
    }

    return this.tenantRepository.remove(id);
  }

  validateTenantData(tenantData) {
    if (!tenantData.fullName || tenantData.fullName.trim() === '') {
      throw new Error('Tên người thuê không được để trống.');
    }
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!tenantData.phone || !phoneRegex.test(tenantData.phone)) {
      throw new Error('TENANT-02: Số điện thoại không hợp lệ (phải từ 10-11 số).');
    }
    if (!tenantData.idCard || tenantData.idCard.trim() === '') {
      throw new Error('CCCD/CMND không được để trống.');
    }
  }
}
