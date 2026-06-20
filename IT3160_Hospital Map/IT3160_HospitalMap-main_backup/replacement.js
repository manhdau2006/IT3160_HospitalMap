        let activeAnswers = {};
        let leafResults = [];

        function resetTriageFlow() {
            resetQuestionnaire();
            itineraryPanel.classList.add('hidden');
            isTriageRunning = false;
            currentItineraryIndex = 0;
            medicalItinerary = [];
        }

        function resetQuestionnaire() {
            activeAnswers = {};
            leafResults = [];
            startTriageBtn.disabled = true;
            renderQuestionnaire();
        }

        function renderQuestionnaire() {
            const symptomsData = window.SYMPTOMS_DATA;
            if (!symptomsData) {
                symptomContainer.innerHTML = '<div class="text-red-400 p-4 font-bold">Lỗi: Không tìm thấy biến window.SYMPTOMS_DATA. Vui lòng kiểm tra file symptoms.js.</div>';
                return;
            }
            symptomContainer.innerHTML = '';
            
            try {
                renderNode(symptomsData, 'root', true, symptomContainer);
            } catch (err) {
                console.error("Lỗi khi render:", err);
                symptomContainer.innerHTML = `<div class="bg-red-900/50 text-red-300 p-4 rounded-xl font-mono text-xs overflow-auto">
                    <strong>Lỗi hiển thị dữ liệu:</strong> ${err.message}<br><br>${err.stack}
                </div>`;
            }
            
            checkCompletion();
        }

        function renderNode(node, pathId, isRoot, container) {
            if (!node || !node.question) return;

            const block = document.createElement('div');
            block.className = 'bg-slate-900/50 border border-white/10 rounded-xl p-5 shadow-lg relative shrink-0';
            
            const title = document.createElement('h4');
            title.className = 'text-cyan-300 font-bold mb-4 text-sm flex items-center gap-2';
            title.innerHTML = `<i class="fa-solid fa-circle-question text-cyan-500"></i> ${node.question}`;
            block.appendChild(title);

            const optionsGrid = document.createElement('div');
            optionsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-3';
            
            const selections = activeAnswers[pathId] || [];

            let hasValidOptions = false;

            if (Array.isArray(node.options)) {
                node.options.forEach((opt, idx) => {
                    hasValidOptions = true;
                    const isSelected = selections.includes(idx);
                    const optBtn = document.createElement('div');
                    
                    let bgClass = isSelected ? 'bg-cyan-500/20 border-cyan-400' : 'bg-slate-800/50 border-white/5 hover:bg-slate-800';
                    optBtn.className = `p-3 rounded-lg border cursor-pointer transition-all ${bgClass}`;
                    
                    optBtn.innerHTML = `
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-300'}">${opt.label}</span>
                            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-cyan-400 bg-cyan-400 text-slate-900' : 'border-slate-500 text-transparent'}">
                                <i class="fa-solid fa-check text-xs"></i>
                            </div>
                        </div>
                    `;

                    optBtn.onclick = () => {
                        // Multi-select for root, single-select for children
                        if (isRoot) {
                            if (isSelected) {
                                activeAnswers[pathId] = selections.filter(i => i !== idx);
                            } else {
                                activeAnswers[pathId] = [...selections, idx];
                            }
                        } else {
                            if (isSelected) {
                                activeAnswers[pathId] = [];
                            } else {
                                activeAnswers[pathId] = [idx];
                            }
                        }
                        
                        // Clear deeper answers
                        const newSelections = activeAnswers[pathId];
                        if (!newSelections.includes(idx)) {
                             clearDeeperAnswers(pathId + '-' + idx);
                        } else if (!isRoot) {
                             // single select, clear others
                             selections.forEach(oldIdx => {
                                 if (oldIdx !== idx) clearDeeperAnswers(pathId + '-' + oldIdx);
                             });
                        }
                        
                        renderQuestionnaire();
                    };

                    optionsGrid.appendChild(optBtn);
                });
            }

            if (hasValidOptions) {
                block.appendChild(optionsGrid);
            }

            // End result leaf node
            if (node.result) {
                const resultBlock = document.createElement('div');
                resultBlock.className = 'mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3';
                resultBlock.innerHTML = `
                    <div class="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-stethoscope"></i>
                    </div>
                    <div>
                        <p class="text-[10px] uppercase text-emerald-500 font-bold">Gợi ý chẩn đoán AI</p>
                        <p class="text-sm text-emerald-300 font-bold">Bạn nên đến: ${node.result}</p>
                    </div>
                `;
                block.appendChild(resultBlock);
            }

            container.appendChild(block);

            // Render children if selected
            if (Array.isArray(node.options)) {
                selections.forEach(idx => {
                    const selectedOpt = node.options[idx];
                    const childPathId = pathId + '-' + idx;
                    
                    const childContainer = document.createElement('div');
                    childContainer.className = 'ml-4 md:ml-8 pl-4 border-l-2 border-cyan-500/30 space-y-4 py-2 relative';
                    
                    // visual connector
                    const connector = document.createElement('div');
                    connector.className = 'absolute top-8 -left-[2px] w-4 h-0.5 bg-cyan-500/30';
                    childContainer.appendChild(connector);

                    if (selectedOpt && selectedOpt.next_node) {
                        renderNode(selectedOpt.next_node, childPathId, false, childContainer);
                        container.appendChild(childContainer);
                    }
                });
            }
        }

        function clearDeeperAnswers(prefix) {
            Object.keys(activeAnswers).forEach(key => {
                if (key.startsWith(prefix)) {
                    delete activeAnswers[key];
                }
            });
        }

        function checkCompletion() {
            const symptomsData = window.SYMPTOMS_DATA;
            if (!symptomsData) return;
            leafResults = [];
            let allComplete = true;

            const selections = activeAnswers['root'] || [];
            if (selections.length === 0) {
                allComplete = false;
            } else {
                selections.forEach(idx => {
                    if (symptomsData.options && symptomsData.options[idx]) {
                        if (!verifyNodeAnswered(symptomsData.options[idx], 'root-' + idx)) {
                            allComplete = false;
                        }
                    }
                });
            }

            startTriageBtn.disabled = !allComplete;
        }

        function verifyNodeAnswered(opt, pathId) {
            if (opt.result) {
                if (!leafResults.some(r => r.department_id === opt.department_id)) {
                    leafResults.push({
                        deptLabel: opt.result,
                        department_id: opt.department_id || 'K_TIEUHOA',
                        roomName: "Phòng Khám " + opt.result,
                        patients: Math.floor(Math.random() * 15) + 1
                    });
                }
                return true;
            }
            if (!opt.next_node) return true;
            
            const sels = activeAnswers[pathId] || [];
            if (sels.length === 0) return false;
            
            let isComplete = true;
            sels.forEach(idx => {
                if (opt.next_node.options && opt.next_node.options[idx]) {
                    if (!verifyNodeAnswered(opt.next_node.options[idx], pathId + '-' + idx)) {
                        isComplete = false;
                    }
                }
            });
            return isComplete;
        }

        async function executeTriageFromSelection() {
            if (leafResults.length === 0 || isTriageRunning) return;
            isTriageRunning = true; startTriageBtn.disabled = true;
            itineraryPanel.classList.add('hidden');

            await new Promise(res => setTimeout(res, 800)); // fake delay cho ngầu

            // Mappings từ department_id sang toạ độ
            const MAPPINGS = {
                'K_TIEUHOA': { r: 18, c: 2 },
                'K_HOHAP': { r: 18, c: 11 },
                'K_THANKINH': { r: 18, c: 3 },
                'K_TIMMACH': { r: 1, c: 2 },
                'K_XUONGKHOP': { r: 8, c: 2 }
            };

            medicalItinerary = leafResults.map(res => {
                const coord = MAPPINGS[res.department_id] || MAPPINGS['K_TIEUHOA'];
                return {
                    deptLabel: res.deptLabel,
                    roomName: res.roomName,
                    x: coord.c,
                    y: coord.r,
                    patients: res.patients
                };
            });

            medicalItinerary.sort((a, b) => a.patients - b.patients);
            renderItineraryPanelUI();

            isTriageRunning = false; startTriageBtn.disabled = false;
        }

        function initApp() {
            buildRealisticHospitalBlueprint();
            bindUserInteractions();
            resetQuestionnaire();
        }

        function renderItineraryPanelUI() {
            itineraryStepsList.innerHTML = '';
            medicalItinerary.forEach((stop, index) => {
                const stepRow = document.createElement('div');
                stepRow.className = "flex items-start gap-3 p-2.5 bg-white/5 border border-white/5 rounded-xl text-xs";
                stepRow.innerHTML = `
                    <div class="w-5 h-5 rounded-md bg-cyan-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-md shadow-cyan-600/40">
                        ${index + 1}
                    </div>
                    <div class="flex-1">
                        <p class="font-bold text-white">${stop.deptLabel}</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">${stop.roomName}</p>
                        <div class="flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-medium">
                            <i class="fa-solid fa-user-clock text-[9px]"></i> Hàng đợi: ${stop.patients} người
                        </div>
                    </div>
                `;
                itineraryStepsList.appendChild(stepRow);
            });
            itineraryPanel.classList.remove('hidden');
        }

