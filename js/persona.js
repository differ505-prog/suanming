/**
 * MAPS (Moment-Aware Persona System)
 * 人物系統控制層
 */

import * as Storage from './storage.js';
import { castZiwei } from './ziwei.js';

// ===== DOM 元素快取 =====
let elements = {};
let addModalStep = 1;

// ===== 初始化 =====
export function initPersonaSystem() {
  Storage.migrateLegacyData();
  cacheElements();
  bindEvents();
  loadCurrentPersona();
  applyPredictivePersona();
}

// ===== 元素快取 =====
function cacheElements() {
  elements = {
    indicator: document.getElementById('persona-indicator'),
    avatar: document.getElementById('persona-avatar'),
    name: document.getElementById('persona-name'),
    panel: document.getElementById('persona-panel'),
    overlay: document.getElementById('persona-overlay'),
    panelClose: document.getElementById('persona-panel-close'),
    list: document.getElementById('persona-list'),
    addBtn: document.getElementById('persona-add-btn'),
    modal: document.getElementById('persona-add-modal'),
    modalClose: document.getElementById('persona-modal-close'),
    stepNext: document.getElementById('persona-step-next'),
    stepPrev: document.getElementById('persona-step-prev'),
    saveBtn: document.getElementById('persona-save-btn'),
    preview: document.getElementById('persona-preview'),
    inputs: {
      nickname: document.getElementById('new-persona-nickname'),
      relationship: document.getElementById('new-persona-relationship'),
      year: document.getElementById('new-persona-year'),
      month: document.getElementById('new-persona-month'),
      day: document.getElementById('new-persona-day'),
      hour: document.getElementById('new-persona-hour'),
      gender: document.getElementById('new-persona-gender')
    }
  };
}

// ===== 事件綁定 =====
function bindEvents() {
  elements.indicator?.addEventListener('click', togglePersonaPanel);
  elements.panelClose?.addEventListener('click', closePersonaPanel);
  elements.overlay?.addEventListener('click', closePersonaPanel);
  elements.addBtn?.addEventListener('click', openAddModal);
  elements.modalClose?.addEventListener('click', closeAddModal);
  elements.modal?.querySelector('.modal-backdrop')?.addEventListener('click', closeAddModal);
  elements.stepNext?.addEventListener('click', handleStepNext);
  elements.stepPrev?.addEventListener('click', handleStepPrev);
  elements.saveBtn?.addEventListener('click', handleSaveNewPersona);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePersonaPanel();
      closeAddModal();
    }
  });
}

// ===== 預測式人物套用（首次開啟）=====
function applyPredictivePersona() {
  const data = Storage.loadData();
  if (!data.autoSuggestionEnabled || data._hasInteracted) return;
  const predictedId = Storage.predictCurrentProfile();
  if (predictedId && predictedId !== data.currentPersonaId) {
    Storage.setCurrentProfile(predictedId);
    applyPersonaTheme(predictedId);
    updatePersonaIndicator();
  }
  data._hasInteracted = true;
  Storage.saveData(data);
}

// ===== 面板開關 =====
function togglePersonaPanel() {
  const isOpen = !elements.panel.classList.contains('hidden');
  isOpen ? closePersonaPanel() : openPersonaPanel();
}

function openPersonaPanel() {
  renderPersonaList();
  elements.panel.classList.remove('hidden');
  elements.overlay.classList.remove('hidden');
  elements.indicator.classList.add('open');
  vibrate(10);
}

function closePersonaPanel() {
  elements.panel.classList.add('hidden');
  elements.overlay.classList.add('hidden');
  elements.indicator.classList.remove('open');
}

// ===== 渲染人物列表 =====
function renderPersonaList() {
  const profiles = Storage.getProfiles();
  const currentId = Storage.getCurrentProfile()?.id;

  elements.list.innerHTML = profiles.map(p => {
    const isActive = p.id === currentId;
    const starText = p.mingStar ? `${p.mingStar}坐命` : '尚未排盤';

    return `
      <div class="persona-list-item ${isActive ? 'active' : ''}"
           data-profile-id="${p.id}"
           onclick="window.__selectPersona('${p.id}')">
        <div class="persona-list-item-avatar">${p.avatar || getDefaultAvatar(p.relationship)}</div>
        <div class="persona-list-item-info">
          <div class="persona-list-item-name">${p.nickname}</div>
          <div class="persona-list-item-meta">${getRelLabel(p.relationship)}</div>
        </div>
        <div class="persona-list-item-star">${starText}</div>
      </div>
    `;
  }).join('');
}

// ===== 選擇人物 =====
export function selectPersona(profileId) {
  const success = Storage.setCurrentProfile(profileId);
  if (!success) return;

  applyPersonaTheme(profileId);
  updatePersonaIndicator();
  closePersonaPanel();
  vibrate(30);

  // 通知其他模組刷新視圖
  window.dispatchEvent(new CustomEvent('personaChanged', { detail: { profileId } }));
}

// ===== 應用人物主題 =====
function applyPersonaTheme(profileId) {
  const profile = Storage.getProfiles().find(p => p.id === profileId);
  if (!profile) return;

  const themeMap = {
    '紫微': 'zrw', '天機': 'tjj', '太陽': 'tyy', '武曲': 'wqx',
    '天同': 'ttd', '廉貞': 'lzh', '天府': 'tfs', '太陰': 'tyyin',
    '貪狼': 'tlq', '巨門': 'jmk', '破軍': 'pjj', '七殺': 'qsh'
  };

  const themeId = themeMap[profile.mingStar] || 'default';
  document.body.removeAttribute('data-persona-theme');
  document.body.setAttribute('data-persona-theme', themeId);

  if (profile.colorDNA?.primary) {
    const root = document.documentElement;
    root.style.setProperty('--accent', profile.colorDNA.primary);
    root.style.setProperty('--accent-alpha', hexToRgba(profile.colorDNA.primary, 0.15));
    root.style.setProperty('--accent-glow', hexToRgba(profile.colorDNA.primary, 0.3));
  }
}

// ===== 更新頂部指示器 =====
function updatePersonaIndicator() {
  const profile = Storage.getCurrentProfile();
  if (!profile) return;
  if (elements.avatar) elements.avatar.textContent = profile.avatar || getDefaultAvatar(profile.relationship);
  if (elements.name) elements.name.textContent = profile.nickname;
}

// ===== 載入當前人物 =====
function loadCurrentPersona() {
  const profile = Storage.getCurrentProfile();
  if (profile) {
    applyPersonaTheme(profile.id);
    updatePersonaIndicator();
  }
}

// ===== 新增人物 Modal =====

function openAddModal() {
  addModalStep = 1;
  resetForm();
  showAddModalStep(1);
  closePersonaPanel();
  elements.modal.classList.remove('hidden');
}

function closeAddModal() {
  elements.modal.classList.add('hidden');
}

function resetForm() {
  Object.values(elements.inputs).forEach(input => { if (input) input.value = ''; });
  elements.inputs.relationship.value = 'self';
  elements.inputs.gender.value = 'm';
  if (elements.preview) elements.preview.innerHTML = '';
}

function showAddModalStep(step) {
  elements.modal.querySelectorAll('.persona-step').forEach(el => el.classList.remove('active'));
  const target = elements.modal.querySelector(`[data-step="${step}"]`);
  if (target) target.classList.add('active');

  // 按鈕狀態
  const isFirst = step === 1;
  const isLast = step === 3;

  if (elements.stepPrev) elements.stepPrev.classList.toggle('hidden', isFirst);
  if (elements.stepNext) elements.stepNext.classList.toggle('hidden', isLast);
  if (elements.saveBtn) elements.saveBtn.classList.toggle('hidden', !isLast);

  addModalStep = step;
}

async function handleStepNext() {
  if (addModalStep === 1) {
    if (!elements.inputs.nickname.value.trim()) {
      elements.inputs.nickname.focus();
      return;
    }
    showAddModalStep(2);
  } else if (addModalStep === 2) {
    if (!elements.inputs.year.value || !elements.inputs.month.value || !elements.inputs.day.value) {
      elements.inputs.year.focus();
      return;
    }
    showAddModalStep(3);
    await computeAndPreview();
  }
}

function handleStepPrev() {
  if (addModalStep > 1) showAddModalStep(addModalStep - 1);
}

async function computeAndPreview() {
  try {
    const birthData = {
      year: parseInt(elements.inputs.year.value),
      month: parseInt(elements.inputs.month.value),
      day: parseInt(elements.inputs.day.value),
      hour: parseInt(elements.inputs.hour.value) || 12,
      gender: elements.inputs.gender.value
    };

    const result = castZiwei(birthData.year, birthData.month, birthData.day, birthData.hour);
    const mingStar = result.mingStar || '天同';
    const colorDNA = Storage.getDefaultColorDNA(mingStar);

    elements._pendingProfile = {
      nickname: elements.inputs.nickname.value.trim(),
      relationship: elements.inputs.relationship.value,
      birthData,
      mingStar,
      mingStars: result.mingStars || [],
      colorDNA
    };

    if (elements.preview) {
      elements.preview.innerHTML = `
        <div class="persona-preview-header">
          <div class="persona-preview-avatar">${getDefaultAvatar(elements.inputs.relationship.value)}</div>
          <div>
            <div class="persona-preview-name">${elements.inputs.nickname.value.trim()}</div>
            <div class="persona-preview-detail">${birthData.year}/${birthData.month}/${birthData.day}</div>
          </div>
        </div>
        <div class="persona-preview-star">⭐ ${mingStar}坐命</div>
        <div class="persona-preview-detail" style="margin-top:8px">${(result.mingStars || []).slice(0, 3).join(' · ')}</div>
      `;
    }
  } catch (err) {
    console.error('排盤失敗:', err);
    alert('排盤失敗，請確認出生日期正確');
    showAddModalStep(2);
  }
}

function handleSaveNewPersona() {
  const pending = elements._pendingProfile;
  if (!pending) return;
  const newProfile = Storage.addProfile(pending);
  selectPersona(newProfile.id);
  closeAddModal();
  elements._pendingProfile = null;
}

// ===== 工具函式 =====

function getRelLabel(rel) {
  return { self: '自己', partner: '伴侶', family: '家人', friend: '朋友', client: '客戶' }[rel] || rel;
}

function getDefaultAvatar(rel) {
  return { self: '👤', partner: '💜', family: '🌸', friend: '🌿', client: '📋' }[rel] || '👤';
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function vibrate(ms) {
  if ('vibrate' in navigator) navigator.vibrate(ms);
}

// 暴露全域
window.__selectPersona = selectPersona;
