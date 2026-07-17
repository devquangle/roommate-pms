/**
 * Tự động chuyển đổi một thẻ <select> thành một dropdown Bootstrap có ô tìm kiếm (searchable dropdown).
 * Giữ nguyên sự đồng bộ giá trị và kích hoạt sự kiện 'change' để không ảnh hưởng đến các hàm logic khác.
 * 
 * @param {HTMLSelectElement} selectElement - Thẻ select cần chuyển đổi
 */
export function initSearchableSelect(selectElement) {
  if (!selectElement) return;

  // Nếu đã được tạo rồi, chỉ cần cập nhật danh sách option mới
  if (selectElement.dataset.searchableSelectInitialized) {
    if (typeof selectElement._updateDropdownOptions === 'function') {
      selectElement._updateDropdownOptions();
    }
    return;
  }

  // Ẩn select gốc
  selectElement.style.display = 'none';
  selectElement.dataset.searchableSelectInitialized = 'true';

  // Wrapper chính
  const wrapper = document.createElement('div');
  
  const hasSpecificWidth = selectElement.style.width && selectElement.style.width !== '100%';
  const isFullWidth = !hasSpecificWidth && (
    selectElement.classList.contains('form-select') || 
    selectElement.classList.contains('form-control') || 
    selectElement.classList.contains('w-100')
  );

  if (isFullWidth) {
    wrapper.className = 'dropdown w-100';
  } else {
    wrapper.className = 'dropdown d-inline-block';
    if (selectElement.style.width) {
      wrapper.style.width = selectElement.style.width;
    }
  }

  // Nút kích hoạt Dropdown
  const button = document.createElement('button');
  button.className = 'btn btn-outline-secondary btn-sm dropdown-toggle text-start d-flex justify-content-between align-items-center';
  button.type = 'button';
  button.dataset.bsToggle = 'dropdown';
  button.dataset.bsBoundary = 'viewport'; // Giúp tránh bị cắt khuất bởi các container overflow
  button.style.minWidth = '140px';
  if (isFullWidth) {
    button.className += ' w-100';
  }

  const labelSpan = document.createElement('span');
  labelSpan.className = 'text-truncate me-2';
  button.appendChild(labelSpan);

  // Menu chứa ô tìm kiếm và danh sách option
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu p-2 shadow-sm';
  menu.style.minWidth = '220px';

  // Input tìm kiếm
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'form-control form-control-sm mb-2';
  searchInput.placeholder = 'Nhập tên để tìm...';
  menu.appendChild(searchInput);

  // Khung chứa các item
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'searchable-select-options-container';
  optionsContainer.style.maxHeight = '200px';
  optionsContainer.style.overflowY = 'auto';
  menu.appendChild(optionsContainer);

  wrapper.appendChild(button);
  wrapper.appendChild(menu);

  // Chèn wrapper vào ngay sau select gốc
  selectElement.parentNode.insertBefore(wrapper, selectElement.nextSibling);

  // Hàm cập nhật các item trong menu dựa trên option trong select gốc
  function updateDropdownOptions() {
    const selectedOption = selectElement.options[selectElement.selectedIndex] || selectElement.options[0];
    labelSpan.textContent = selectedOption ? selectedOption.textContent : 'Tất cả';

    optionsContainer.innerHTML = '';
    const items = Array.from(selectElement.options).map(opt => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'dropdown-item py-1 px-2 rounded-1 small text-start';
      item.textContent = opt.textContent;
      item.dataset.value = opt.value;
      if (opt.selected) {
        item.classList.add('active', 'bg-primary', 'text-white');
      }

      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        selectElement.value = opt.value;
        // Kích hoạt sự kiện change trên selectElement để các listener khác chạy
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        
        updateDropdownOptions();

        // Ẩn menu dropdown của Bootstrap
        if (window.bootstrap && window.bootstrap.Dropdown) {
          const bsDropdown = window.bootstrap.Dropdown.getOrCreateInstance(button);
          if (bsDropdown) bsDropdown.hide();
        }
      });

      return item;
    });

    if (items.length === 0) {
      const noResult = document.createElement('div');
      noResult.className = 'text-muted text-center py-2 small';
      noResult.textContent = 'Không có dữ liệu';
      optionsContainer.appendChild(noResult);
    } else {
      items.forEach(item => optionsContainer.appendChild(item));
    }
  }

  // Lưu lại hàm cập nhật để có thể gọi từ bên ngoài khi cập nhật lại select gốc
  selectElement._updateDropdownOptions = updateDropdownOptions;

  // Lắng nghe sự kiện gõ tìm kiếm
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const items = optionsContainer.querySelectorAll('.dropdown-item');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      if (text.includes(query)) {
        item.style.setProperty('display', 'block', 'important');
      } else {
        item.style.setProperty('display', 'none', 'important');
      }
    });
  });

  // Tự động focus ô tìm kiếm khi mở dropdown và reset tìm kiếm
  button.addEventListener('show.bs.dropdown', () => {
    searchInput.value = '';
    const items = optionsContainer.querySelectorAll('.dropdown-item');
    items.forEach(item => item.style.display = '');
    setTimeout(() => searchInput.focus(), 150);
  });

  // Lắng nghe sự thay đổi giá trị của select gốc để đồng bộ giao diện
  selectElement.addEventListener('change', () => {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    labelSpan.textContent = selectedOption ? selectedOption.textContent : 'Tất cả';
    
    const items = optionsContainer.querySelectorAll('.dropdown-item');
    items.forEach(item => {
      if (item.dataset.value === selectElement.value) {
        item.classList.add('active', 'bg-primary', 'text-white');
      } else {
        item.classList.remove('active', 'bg-primary', 'text-white');
      }
    });
  });

  // Khởi chạy ban đầu
  updateDropdownOptions();
}
