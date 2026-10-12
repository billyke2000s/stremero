'use strict';
const cards=[...document.querySelectorAll('#transition-grid .card')];
for(const button of document.querySelectorAll('[data-category].chip'))button.addEventListener('click',()=>{for(const b of document.querySelectorAll('.chip'))b.setAttribute('aria-pressed',String(b===button));let shown=0;for(const card of cards){card.hidden=button.dataset.category!=='All'&&card.dataset.category!==button.dataset.category;if(!card.hidden)shown++}document.getElementById('transition-empty').hidden=shown>0});
