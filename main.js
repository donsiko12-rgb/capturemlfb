// main.js

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const resultsBody = document.getElementById('resultsBody');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const projectNameInput = document.getElementById('projectName');

    // Store processed results
    let resultsData = [];

    // --- Drag and Drop Handling ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // --- Main Logic ---
    function handleFiles(files) {
        // Remove empty state message if it exists
        if (resultsBody.querySelector('.empty-state')) {
            resultsBody.innerHTML = '';
        }

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert(`El archivo ${file.name} no es una imagen válida.`);
                return;
            }

            const rowId = `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            createResultRow(rowId, file.name);
            processImage(file, rowId);
        });
    }

    function createResultRow(id, fileName) {
        const tr = document.createElement('tr');
        tr.id = id;
        tr.innerHTML = `
            <td class="file-name" title="${fileName}">${fileName}</td>
            <td><span class="status-badge status-processing">Procesando...</span></td>
            <td class="data-cell mlfb-cell">-</td>
            <td class="data-cell zcode-cell">-</td>
        `;
        resultsBody.appendChild(tr);
    }

    async function processImage(file, rowId) {
        try {
            // Utilizamos Tesseract.js para extraer el texto
            // Se usa worker local temporal si se requiere más velocidad, pero para simplificar usamos el default
            const result = await Tesseract.recognize(
                file,
                'eng+spa', // Modelos en inglés y español para mejorar detección alfanumérica
                {
                    logger: m => console.log(m) // Opcional: ver el progreso en consola
                }
            );

            const text = result.data.text;
            console.log("Texto extraído de", file.name, ":", text);

            // Extraer MLFB y Z-Codes
            const extractedData = extractDataFromText(text);

            // Actualizar UI
            updateRowResult(rowId, extractedData, file.name);

        } catch (error) {
            console.error("Error al procesar la imagen:", error);
            const tr = document.getElementById(rowId);
            if (tr) {
                tr.querySelector('.status-badge').className = 'status-badge status-error';
                tr.querySelector('.status-badge').textContent = 'Error OCR';
            }
        }
    }

    function extractDataFromText(text) {
        // Regex para MLFB (Ej. 6SL3720-1TG34-1AA3-Z)
        // Busca secuencias alfanuméricas separadas por guiones, frecuentemente precedidas por '1P' en Siemens
        const mlfbRegex = /\b[A-Z0-9]{4,7}-[A-Z0-9]{4,5}-[A-Z0-9]{4,5}(?:-[A-Z0-9]+)?\b/gi;
        
        // Regex para Códigos Z (Ej. D99+M21+M70+M84+M91+Q82+Y11+Y33)
        // Busca secuencias de códigos cortos separados por signos '+'
        const zCodeRegexPlus = /\b[A-Z0-9]{2,4}(?:\+[A-Z0-9]{2,4})+\b/gi;
        // Fallback original para Z codes si se usa el formato Z:
        const zCodeRegexPrefix = /Z[\s:]+([A-Z0-9\+\-]+)/gi;

        let mlfbMatches = text.match(mlfbRegex) || [];
        // Limpiar duplicados y vacíos
        mlfbMatches = mlfbMatches.map(m => m.trim());
        const uniqueMlfb = [...new Set(mlfbMatches)].join(', ');

        let zCodes = [];
        
        // Extraer formato D99+M21...
        const plusMatches = text.match(zCodeRegexPlus);
        if (plusMatches) {
            plusMatches.forEach(match => zCodes.push(match.trim()));
        }

        // Extraer formato Z: ...
        let match;
        while ((match = zCodeRegexPrefix.exec(text)) !== null) {
            if (match[1] && match[1].trim().length > 1) {
                zCodes.push(match[1].trim());
            }
        }
        
        const uniqueZCodes = [...new Set(zCodes)].join(', ');

        return {
            mlfb: uniqueMlfb || 'No detectado',
            zCode: uniqueZCodes || 'No detectado'
        };
    }

    function updateRowResult(rowId, data, fileName) {
        const tr = document.getElementById(rowId);
        if (!tr) return;

        const isSuccess = data.mlfb !== 'No detectado' || data.zCode !== 'No detectado';

        tr.querySelector('.status-badge').className = `status-badge ${isSuccess ? 'status-success' : 'status-error'}`;
        tr.querySelector('.status-badge').textContent = isSuccess ? 'Completado' : 'No Encontrado';
        
        tr.querySelector('.mlfb-cell').textContent = data.mlfb;
        tr.querySelector('.zcode-cell').textContent = data.zCode;

        // Guardar para exportación
        resultsData.push({
            "Archivo": fileName,
            "MLFB (Nº Parte)": data.mlfb,
            "Código Z": data.zCode
        });

        // Habilitar botón de exportar
        exportExcelBtn.disabled = false;
    }

    // --- Exportación a Excel ---
    exportExcelBtn.addEventListener('click', () => {
        if (resultsData.length === 0) return;

        const projectName = projectNameInput.value.trim() || 'Proyecto_Inventario';
        
        // Crear un nuevo libro de trabajo (workbook)
        const wb = XLSX.utils.book_new();
        
        // Convertir los datos JSON a una hoja de cálculo (worksheet)
        const ws = XLSX.utils.json_to_sheet(resultsData);
        
        // Ajustar el ancho de las columnas (opcional pero recomendable)
        const wscols = [
            {wch: 30}, // Archivo
            {wch: 25}, // MLFB
            {wch: 20}  // Código Z
        ];
        ws['!cols'] = wscols;

        // Añadir la hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, "Placas");
        
        // Generar archivo y forzar descarga
        XLSX.writeFile(wb, `${projectName}.xlsx`);
    });

    // Estado vacío inicial
    if (resultsBody.children.length === 0) {
        resultsBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="4">No hay imágenes procesadas aún. Sube algunas fotos de placas para comenzar.</td>
            </tr>
        `;
    }
});
