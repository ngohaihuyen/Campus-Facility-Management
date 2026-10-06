// js/rooms.js - browse, search and filter the rooms

const user = requireLogin('STUDENT', 'TEACHER', 'STAFF');

document.getElementById('searchIcon').innerHTML = icon('search', 16);
const searchInput = document.getElementById('search');
const onlyMineBox = document.getElementById('onlyMine');

// One room card
function roomCard(room) {
  const canBook = Number(room.can_book) === 1 && room.status === 'AVAILABLE';
  return `
    <article class="room-card">
      ${roomImage(room)}
      <div class="body">
        <div class="top">
          <span class="chip chip-blue">${esc(room.category)}</span>
          <span class="cap">${icon('person', 14)}${esc(room.capacity ?? '?')} people</span>
        </div>
        <h3>${esc(room.name)}</h3>
        <div class="where">${icon('pin', 14)}${esc(room.location || '-')}</div>
        <p class="desc">${esc(room.description || 'No description.')}</p>
        ${room.status === 'AVAILABLE' ? '' : `<div>${badge(room.status)}</div>`}
        ${Number(room.can_book) === 1 ? '' :
          `<div class="chip" style="align-self:flex-start">Only ${esc(room.who_can_book.replaceAll(',', ', '))}</div>`}
        <a class="btn ${canBook ? '' : 'btn-light'} btn-block" href="room.html?id=${room.id}">View Details</a>
      </div>
    </article>`;
}

async function loadCategories() {
  const categories = await api('GET', '/facilities/categories');
  document.getElementById('category').innerHTML = '<option value="">All Spaces</option>'
    + categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
}

async function loadRooms() {
  const query = new URLSearchParams();
  if (searchInput.value.trim()) query.set('search', searchInput.value.trim());
  if (document.getElementById('category').value) query.set('categoryId', document.getElementById('category').value);
  if (document.getElementById('capacity').value) query.set('minCapacity', document.getElementById('capacity').value);
  if (document.getElementById('onlyOpen').checked) query.set('onlyAvailable', 'true');

  try {
    let rooms = await api('GET', '/facilities?' + query.toString());
    if (onlyMineBox.checked) rooms = rooms.filter((r) => Number(r.can_book) === 1);

    document.getElementById('count').textContent =
      `${rooms.length} ${rooms.length === 1 ? 'facility' : 'facilities'} found`;
    document.getElementById('rooms').innerHTML = rooms.length
      ? rooms.map(roomCard).join('')
      : '<div class="card empty">No room matches your filters.</div>';
  } catch (err) {
    showMessage('message', err.message);
  }
}

document.getElementById('filterForm').addEventListener('submit', (event) => {
  event.preventDefault();
  loadRooms();
});
// Typing or ticking a box also refreshes the list
for (const id of ['category', 'capacity', 'onlyOpen', 'onlyMine']) {
  document.getElementById(id).addEventListener('change', loadRooms);
}
searchInput.addEventListener('input', loadRooms);

if (user) {
  // The dashboard can send a search here: rooms.html?search=lab
  searchInput.value = new URLSearchParams(window.location.search).get('search') || '';
  loadCategories().then(loadRooms);
}
