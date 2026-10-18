<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, errorText, type InventoryItem, type ItemInput } from './api';
const categories = ['Electrical', 'Measurement', 'Safety', 'Mechanical'];
const items = ref<InventoryItem[]>([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const search = ref('');
const selectedCategory = ref('');
const lowStockOnly = ref(false);
const editingId = ref<number | null>(null);
const deletingItem = ref<InventoryItem | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);
const emptyForm = (): ItemInput => ({ name: '', category: 'Electrical', quantity: 0, unit_price: 0, location: '', reorder_level: 5 });
const form = ref<ItemInput>(emptyForm());
const visibleItems = computed(() => items.value.filter((item) => {
  const term = search.value.trim().toLowerCase();
  return (item.name.toLowerCase().includes(term) || item.location.toLowerCase().includes(term)) &&
    (!selectedCategory.value || item.category === selectedCategory.value) &&
    (!lowStockOnly.value || item.quantity <= item.reorder_level);
}));
const totalUnits = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));
const totalValue = computed(() => items.value.reduce((sum, item) => sum + item.quantity * item.unit_price, 0));
const lowStockCount = computed(() => items.value.filter((item) => item.quantity <= item.reorder_level).length);
const money = (value: number) => new Intl.NumberFormat('en-TH', { style: 'currency', currency: 'THB' }).format(value);
const dateText = (value: string) => new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
async function fetchItems(): Promise<boolean> {
  loading.value = true;
  try { items.value = (await api.get<InventoryItem[]>('/items')).data; return true; }
  catch (error) { errorMessage.value = errorText(error); return false; }
  finally { loading.value = false; }
}
async function refresh() { errorMessage.value = ''; successMessage.value = ''; await fetchItems(); }
function resetForm() { editingId.value = null; form.value = emptyForm(); }
function editItem(item: InventoryItem) {
  editingId.value = item.id;
  form.value = { name: item.name, category: item.category, quantity: item.quantity, unit_price: item.unit_price, location: item.location, reorder_level: item.reorder_level };
  errorMessage.value = ''; successMessage.value = '';
  nameInput.value?.focus();
}
async function saveItem() {
  saving.value = true; errorMessage.value = ''; successMessage.value = '';
  try {
    if (editingId.value !== null) await api.put(`/items/${editingId.value}`, form.value);
    else await api.post('/items', form.value);
    const wasEditing = editingId.value !== null;
    resetForm();
    if (await fetchItems()) successMessage.value = wasEditing ? 'Item updated successfully.' : 'Item added successfully. Clear filters if the new item is hidden.';
    else errorMessage.value = 'Item saved, but the list could not be refreshed. Press Refresh before trying again.';
  } catch (error) { errorMessage.value = errorText(error); }
  finally { saving.value = false; }
}
async function deleteItem() {
  if (!deletingItem.value) return;
  const id = deletingItem.value.id;
  saving.value = true; errorMessage.value = ''; successMessage.value = '';
  try {
    await api.delete(`/items/${id}`);
    deletingItem.value = null;
    if (editingId.value === id) resetForm();
    if (await fetchItems()) successMessage.value = 'Item deleted successfully.';
    else errorMessage.value = 'Item deleted, but the list could not be refreshed. Press Refresh.';
  } catch (error) { errorMessage.value = errorText(error); deletingItem.value = null; }
  finally { saving.value = false; }
}
function clearFilters() { search.value = ''; selectedCategory.value = ''; lowStockOnly.value = false; }
onMounted(fetchItems);
</script>

<template>
  <main>
    <header class="masthead"><div><p class="eyebrow">THE ENGINEERING WORKSPACE</p><h1>Inventory, in order.</h1><p class="subtitle">A little organization. A better day in the lab.</p></div><span class="header-tag">Equipment manager</span></header>
    <section class="stats" aria-label="All inventory totals">
      <article><span>ITEM TYPES</span><strong>{{ items.length }}</strong><small>Across your inventory</small></article>
      <article><span>TOTAL UNITS</span><strong>{{ totalUnits }}</strong><small>Ready for your next project</small></article>
      <article><span>INVENTORY VALUE</span><strong class="value">{{ money(totalValue) }}</strong><small>Quantity × unit price</small></article>
      <article class="stock-stat"><span>LOW STOCK</span><strong>{{ lowStockCount }}</strong><small>At or below reorder level</small></article>
    </section>
    <p v-if="errorMessage" class="message error" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="message success" role="status">{{ successMessage }}</p>
    <div class="workspace">
      <section class="panel editor" aria-labelledby="form-title">
        <p class="eyebrow">{{ editingId !== null ? 'MAKE AN ADJUSTMENT' : 'GROW YOUR INVENTORY' }}</p>
        <h2 id="form-title">{{ editingId !== null ? `Edit item #${editingId}` : 'Add an item' }}</h2>
        <form @submit.prevent="saveItem">
          <fieldset :disabled="saving || loading">
            <label for="name">Item name</label><input id="name" ref="nameInput" v-model="form.name" placeholder="e.g. Digital Multimeter" required maxlength="100" pattern=".*\S.*">
            <label for="category">Category</label><select id="category" v-model="form.category"><option v-for="category in categories" :key="category">{{ category }}</option></select>
            <div class="form-row"><div><label for="quantity">Quantity</label><input id="quantity" v-model.number="form.quantity" type="number" min="0" max="2147483647" step="1" required></div><div><label for="price">Unit price (THB)</label><input id="price" v-model.number="form.unit_price" type="number" min="0" max="99999999.99" step="0.01" required></div></div>
            <label for="location">Storage location</label><input id="location" v-model="form.location" placeholder="e.g. Shelf A1" maxlength="60" required pattern=".*\S.*">
            <label for="reorder">Reorder level</label><input id="reorder" v-model.number="form.reorder_level" type="number" min="0" max="2147483647" step="1" required>
            <p class="hint">An item is low on stock when quantity ≤ reorder level.</p>
            <button class="primary submit" type="submit">{{ saving ? 'Saving…' : editingId !== null ? 'Save changes' : '+ Add item' }}</button>
            <button v-if="editingId !== null" class="secondary submit" type="button" @click="resetForm">Cancel editing</button>
          </fieldset>
        </form>
      </section>
      <section class="panel collection" aria-labelledby="collection-title" :aria-busy="loading">
        <div class="collection-heading"><div><p class="eyebrow">EVERYTHING IN ITS PLACE</p><h2 id="collection-title">Your equipment <span class="count">{{ visibleItems.length }}</span></h2></div><button class="secondary" :disabled="loading || saving" @click="refresh">{{ loading ? 'Loading…' : '↻ Refresh' }}</button></div>
        <div class="filters"><div class="search"><label class="sr-only" for="search">Search inventory</label><input id="search" v-model="search" type="search" placeholder="Search by name or location…"></div><label class="sr-only" for="filter">Filter category</label><select id="filter" v-model="selectedCategory"><option value="">All categories</option><option v-for="category in categories" :key="category">{{ category }}</option></select></div>
        <div class="list-meta"><label class="checkbox"><input v-model="lowStockOnly" type="checkbox"> Low stock only</label><span>Newest added first</span><button class="text-button" @click="clearFilters">Clear filters</button></div>
        <p v-if="loading" class="empty" role="status">Loading inventory…</p>
        <div v-else-if="visibleItems.length === 0" class="empty"><h3>No items to show</h3><p>Add your first item or adjust your filters.</p></div>
        <div v-else class="table-wrap"><table><thead><tr><th>Equipment</th><th>Stock</th><th>Unit price</th><th>Location</th><th>Actions</th></tr></thead><tbody><tr v-for="item in visibleItems" :key="item.id"><td><strong>{{ item.name }}</strong><span class="item-detail">#{{ item.id }} · {{ item.category }}</span><time class="item-detail" :datetime="item.created_at">{{ dateText(item.created_at) }}</time></td><td><strong>{{ item.quantity }}</strong><span class="badge" :class="item.quantity <= item.reorder_level ? 'low' : 'ok'">{{ item.quantity <= item.reorder_level ? 'Low stock' : 'In stock' }}</span><span class="item-detail">Reorder: {{ item.reorder_level }}</span></td><td class="nowrap">{{ money(item.unit_price) }}</td><td>{{ item.location }}</td><td><div class="actions"><button class="edit" :disabled="saving" :aria-label="`Edit ${item.name}`" @click="editItem(item)">Edit</button><button class="delete" :disabled="saving" :aria-label="`Delete ${item.name}`" @click="deletingItem = item">Delete</button></div></td></tr></tbody></table></div>
      </section>
    </div>
    <footer>Engineering Inventory · Built for a well-organized workspace</footer>
    <div v-if="deletingItem" class="modal-backdrop" @keydown.esc="!saving && (deletingItem = null)">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" tabindex="-1">
        <p class="eyebrow">CONFIRM REMOVAL</p><h2 id="delete-title">Delete this item?</h2><p id="delete-description">“{{ deletingItem.name }}” will be removed from the inventory.</p><div class="actions"><button class="secondary" :disabled="saving" @click="deletingItem = null">Keep item</button><button class="danger" :disabled="saving" @click="deleteItem">{{ saving ? 'Deleting…' : 'Delete item' }}</button></div>
      </section>
    </div>
  </main>
</template>
