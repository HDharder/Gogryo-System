document.getElementById("exportBtn").addEventListener("click", () => {
  const elements = document.querySelectorAll("[saveid]");
  const data = {};

  elements.forEach(el => {
    const id = el.getAttribute("saveid");

    if (el.type === "checkbox") {
      // Checkbox → salvar estado marcado
      data[id] = { type: "checkbox", checked: el.checked };
    } 
    else if (el.type === "hidden" && el.id === "imageDataUrl") {
        data[id] = { type: "image", src: el.value };
    }
    else if (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.tagName === "SELECT") {
      // Inputs e Textareas normais
      data[id] = { type: "input", value: el.value };
    } 
    else {
      // Outros elementos (divs como mana/slots/energy)
      data[id] = {
        type: "element",
        innerHTML: el.innerHTML || null,
        className: el.className || null,
        style: el.getAttribute("style") || null,
        value: el.getAttribute("value") || null,
      };
    }
  });

  // Exportar como JSON
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const name = (document.getElementById('characterName')?.value || 'character') + '_sheet';
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.json`;
  link.click();
});

document.getElementById("importBtn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const text = String(evt.target.result || '');
            const importedData = JSON.parse(text);
            console.log('Imported keys:', Object.keys(importedData));

            // 1) Primeiro: aplicar tudo EXCETO imagens / manabox / slots / energy
            for (const sid in importedData) {
            const rec = importedData[sid];
            // tenta localizar pelo saveid primeiro, se não, por id
            const el = document.querySelector(`[saveid='${sid}']`) || document.getElementById(sid);
            if (!el) continue;

            // skip image and deferred kinds for now
            if (rec && (rec.type === 'image' || String(sid).startsWith('manabox') || String(sid).startsWith('slot') || String(sid).startsWith('energy'))) {
                continue;
            }

            // Checkbox
            if (el.tagName === 'INPUT' && el.type === 'checkbox') {
                el.checked = !!rec.checked;
                continue;
            }

            // Inputs / textareas / selects
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                if (rec.value !== undefined) el.value = rec.value;
                continue;
            }

            // outros elementos: restaurar classe / html / style se vierem
            if (rec.className) el.className = rec.className;
            if (rec.innerHTML !== undefined) el.innerHTML = rec.innerHTML;
            if (rec.style) el.setAttribute('style', rec.style);
            if (rec.value) el.setAttribute('value', rec.value);
            }

            document.getElementById("slotsmod").value = importedData["slotsmod"].value

            // 2) Rodar funções principais (ordem sua)
            updateTenacityDisplay && updateTenacityDisplay();
            updateDexterityDisplay && updateDexterityDisplay();
            updateMindDisplay && updateMindDisplay();
            updatemaxHP && updatemaxHP();
            updateReduction && updateReduction();
            updateDodge && updateDodge();
            activateEnergiesFromMastery && activateEnergiesFromMastery();
            updateSkill && updateSkill();
            updateArmor && updateArmor();
            gerarSlots && gerarSlots();


            // 3) Gera mana cells com base no manamax atualizado
            /*const manamaxEl = document.getElementById('manamax');
            const manamaxVal = manamaxEl ? parseInt(manamaxEl.value || '0', 10) : 0;
            if (typeof createManaCells === 'function') createManaCells(manamaxVal);*/

            (function(){
                const MAX_CELLS = 50; // 2 rows × 25 cols
                const manamaxInput = document.getElementById('manamax');
                const manaContainer = document.getElementById('manaContainer');

                // cria N células (exatamente n), todas preenchidas inicialmente
                function createManaCells(n){
                // clamp
                let val = parseInt(n, 10);
                if (isNaN(val)) val = 0;
                if (val < 0) val = 0;
                if (val > MAX_CELLS) val = MAX_CELLS;

                manaContainer.innerHTML = ''; // remove anteriores

                for(let i = 0; i < val; i++){
                    const cell = document.createElement('div');
                    cell.className = 'mana-box filled';
                    cell.setAttribute("saveid", `manabox${i + 1}`);
                    cell.dataset.index = i;
                    // toggle filled state on click so user can mark spent mana
                    cell.addEventListener('click', () => {
                    cell.classList.toggle('filled');
                    });
                    manaContainer.appendChild(cell);
                }

                // NOTE: não criamos células vazias além de N — assim a quantidade de quadrados
                // exibidos é exatamente igual a manamax.
                }

                // listener: quando o input muda, cria exatamente manamax quadrados
                manamaxInput.addEventListener('input', (e) => {
                createManaCells(e.target.value);
                });

                // inicializa com valor atual do input
                createManaCells(manamaxInput.value || 0);

                // função pública opcional
                window.setManaMax = function(v){
                manamaxInput.value = v;
                createManaCells(v);
                };
            })();

            /*
            // 4) Ajustar mastery (mesma lógica que você usava)
            const msElements = document.querySelectorAll('.ms');
            let maxId = 0;
            msElements.forEach(el => {
            const idNum = parseInt(String(el.id).slice(1, 2), 10);
            if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
            });
            if (maxId > 0 && window.mastery) mastery.value = 2 + maxId;*/

            // 5) Agora aplicar imagens / manabox / slots / energy (último passo)
            // IMAGE: procurar registro de imagem no JSON
            // Pode estar sob a chave saveid (ex. "imagecha") — então iteramos procurando rec.type==='image'
            let imageRecord = null;
            for (const sid in importedData) {
            const rec = importedData[sid];
            if (rec && rec.type === 'image') {
                imageRecord = { sid, rec };
                break;
            }
            }
            if (imageRecord) {
            // localizar o hidden que guarda o dataURL: preferir elemento com that saveid, senão fallback para id 'imageDataUrl'
            const hiddenBySaveid = document.querySelector(`[saveid='${imageRecord.sid}']`);
            const hiddenById = document.getElementById('imageDataUrl');
            const hidden = hiddenBySaveid || hiddenById;
            if (hidden && hidden.tagName === 'INPUT' && hidden.type === 'hidden') {
                hidden.value = imageRecord.rec.src || imageRecord.rec.data || imageRecord.rec.value || '';
                // redesenha placeholder
                const placeholder = document.getElementById('imagePlaceholder');
                if (placeholder) {
                placeholder.innerHTML = '';
                if (hidden.value) {
                    const img = document.createElement('img');
                    img.src = hidden.value;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    placeholder.appendChild(img);
                } else {
                    const hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = 'Click to upload image';
                    placeholder.appendChild(hint);
                }
                }
            } else {
                console.warn('Hidden input for image not found (tried saveid and id). imageRecord.sid=', imageRecord.sid);
            }
            }

            // MANABOX / SLOTS / ENERGY: aplicar classes salvas (procura por cada saveid referente)
            for (const sid in importedData) {
            if (!(sid.startsWith('manabox') || sid.startsWith('slot') || sid.startsWith('energy'))) continue;
            const rec = importedData[sid];
            const el = document.querySelector(`[saveid='${sid}']`) || document.getElementById(sid);
            if (!el) continue;
            if (rec.className) el.className = rec.className;
            if (typeof rec.checked !== 'undefined' && el.type === 'checkbox') el.checked = !!rec.checked;
            }
            console.log(document.querySelector("[saveid='equipprof4']"));

            console.log('Import applied successfully.');
        } catch (err) {
            console.error('Erro ao importar JSON:', err);
            alert('Falha ao carregar arquivo: verifique se o JSON é válido e exportado pelo sistema.');
        } finally {
            // limpa input file para permitir reimportar o mesmo arquivo
            try { evt.target.value = ''; } catch (e) {}
        }
        };

    reader.readAsText(file);
  };

  input.click();
});