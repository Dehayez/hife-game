export function initCharacterSwitcher({ mount, options, value, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__control';

  const label = document.createElement('label');
  label.className = 'ui__label';
  label.textContent = 'Character';
  label.setAttribute('for', 'char-select');

  const select = document.createElement('select');
  select.className = 'ui__select';
  select.id = 'char-select';

  options.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === value) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => onChange(select.value));

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  mount.appendChild(wrapper);

  return {
    setValue(next) {
      select.value = next;
    }
  };
}


