// =================================================================
// 步驟一：模擬成績數據接收
// -----------------------------------------------------------------

// 確保這是全域變數
let finalScore = 0; 
let maxScore = 0;
let scoreText = ""; // 用於 p5.js 繪圖的文字

// Fireworks 系列全域變數
let fireworks = [];
let gravity;
let fireworkActive = false; // 是否正在玩煙火動畫

window.addEventListener('message', function (event) {
    // 執行來源驗證...
    // ...
    const data = event.data;
    
    if (data && data.type === 'H5P_SCORE_RESULT') {
        
        // !!! 關鍵步驟：更新全域變數 !!!
        finalScore = data.score; // 更新全域變數
        maxScore = data.maxScore;
        scoreText = `最終成績分數: ${finalScore}/${maxScore}`;
        
        console.log("新的分數已接收:", scoreText); 
        
        // 計算百分比（處理 maxScore = 0）
        let percentage = 0;
        if (maxScore > 0) percentage = (finalScore / maxScore) * 100;

        // 如果得到 100 分或百分比 >= 100，觸發煙火
        if (percentage >= 100 && maxScore > 0) {
            // 啟動煙火動畫
            spawnFireworks(6); // 產生若干發煙火
            fireworkActive = true;
            if (typeof loop === 'function') {
                loop(); // 開始連續繪製動畫
            }
        } else {
            // 其他情況只需重繪一次（靜態顯示）
            if (typeof redraw === 'function') {
                redraw(); 
            }
        }
    }
}, false);


// =================================================================
// 步驟二：使用 p5.js 繪製分數 (在網頁 Canvas 上顯示)
// -----------------------------------------------------------------

function setup() { 
    // 建立畫布並初始化
    createCanvas(windowWidth / 2, windowHeight / 2); 
    background(255); 
    colorMode(RGB);
    gravity = createVector(0, 0.25);
    noLoop(); // 預設不連續繪製 (除非需要動畫)
} 

function windowResized() {
    resizeCanvas(windowWidth / 2, windowHeight / 2);
    redraw();
}

// 簡單的 Firework/Particle 實作（基於 p5.js 教學範例）
class Particle {
    constructor(pos, vel, hu, isFirework) {
        this.pos = pos.copy();
        this.vel = vel.copy();
        this.acc = createVector(0, 0);
        this.hu = hu || random(0, 360);
        this.lifespan = 255;
        this.isFirework = isFirework || false;
    }

    applyForce(f) {
        this.acc.add(f);
    }

    update() {
        if (!this.isFirework) {
            // 空氣阻力
            this.vel.mult(0.98);
            this.lifespan -= 4;
        }
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }

    done() {
        return this.lifespan <= 0;
    }

    show() {
        colorMode(HSB);
        if (this.isFirework) {
            stroke(this.hu, 255, 255);
            strokeWeight(4);
            point(this.pos.x, this.pos.y);
        } else {
            noStroke();
            fill(this.hu, 255, 255, this.lifespan);
            ellipse(this.pos.x, this.pos.y, 6);
        }
        colorMode(RGB);
    }
}

class Firework {
    constructor() {
        this.hu = random(0, 360);
        // 火箭從底部隨機 x 發射
        this.firework = new Particle(createVector(random(width), height), createVector(random(-1, 1), random(-12, -8)), this.hu, true);
        this.exploded = false;
        this.particles = [];
    }

    done() {
        return this.exploded && this.particles.length === 0;
    }

    explode() {
        let n = floor(random(60, 140)); // 每發爆炸的粒子數量
        for (let i = 0; i < n; i++) {
            let vel = p5.Vector.random2D();
            vel.mult(random(2, 8));
            let p = new Particle(this.firework.pos.copy(), vel, this.hu, false);
            this.particles.push(p);
        }
    }

    update() {
        if (!this.exploded) {
            this.firework.applyForce(gravity);
            this.firework.update();
            // 當火箭向上速度變為正（開始下墜）時爆炸，或小機率提前爆炸
            if (this.firework.vel.y >= 0 || random(1) < 0.01) {
                this.exploded = true;
                this.explode();
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.applyForce(gravity.copy().mult(0.2)); // 爆炸後粒子受較小重力影響
            p.update();
            if (p.done()) {
                this.particles.splice(i, 1);
            }
        }
    }

    show() {
        if (!this.exploded) {
            this.firework.show();
        }
        for (let p of this.particles) {
            p.show();
        }
    }
}

function spawnFireworks(count) {
    for (let i = 0; i < count; i++) {
        fireworks.push(new Firework());
    }
}

// draw() 主循環
function draw() { 
    // 背景使用部分透明以產生拖影效果（動畫時）
    if (fireworkActive && fireworks.length > 0) {
        background(0, 0, 0, 25); // 深色背景搭配透明度留拖尾 (需要 p5.js 支持的 RGBA)
    } else {
        background(255); // 靜態時白底
    }

    // 計算百分比（避免 /0）
    let percentage = 0;
    if (maxScore > 0) percentage = (finalScore / maxScore) * 100;

    textSize(80); 
    textAlign(CENTER);
    
    // -----------------------------------------------------------------
    // A. 根據分數區間改變文本顏色和內容 (畫面反映一)
    // -----------------------------------------------------------------
    if (percentage >= 90 && percentage < 100) {
        // 滿分或高分（但非 100）
        fill(0, 200, 50); // 綠色
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
    } else if (percentage >= 60) {
        // 中等分數
        fill(255, 181, 35); 
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
    } else if (percentage > 0) {
        // 低分
        fill(200, 0, 0); 
        text("需要加強努力！", width / 2, height / 2 - 50);
    } else {
        // 尚未收到分數或分數為 0
        fill(150);
        text(scoreText || "尚未收到成績", width / 2, height / 2);
    }

    // 顯示具體分數
    textSize(50);
    fill(50);
    text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 50);
    
    // -----------------------------------------------------------------
    // B. 根據分數觸發不同的幾何圖形反映 (畫面反映二)
    // -----------------------------------------------------------------
    if (percentage >= 100 && maxScore > 0) {
        // 100 分：畫金色大圓並播放煙火（動畫）
        fill(255, 215, 0, 180); // 金色
        noStroke();
        circle(width / 2, height / 2 + 150, 180);
    } else if (percentage >= 90) {
        fill(0, 200, 50, 150);
        noStroke();
        circle(width / 2, height / 2 + 150, 150);
    } else if (percentage >= 60) {
        fill(255, 181, 35, 150);
        rectMode(CENTER);
        rect(width / 2, height / 2 + 150, 150, 150);
    }

    // -----------------------------------------------------------------
    // C. 煙火動畫處理（如果有）
    // -----------------------------------------------------------------
    if (fireworks.length > 0) {
        // 在動畫期間使用深色背景（在上面已用 partial alpha），更新並顯示所有煙火
        for (let i = fireworks.length - 1; i >= 0; i--) {
            let f = fireworks[i];
            f.update();
            f.show();
            if (f.done()) {
                fireworks.splice(i, 1);
            }
        }
    }

    // 若煙火隊列已空，停止動畫 (回到靜態繪製)
    if (fireworkActive && fireworks.length === 0) {
        fireworkActive = false;
        // 停止連續繪製以節省資源
        if (typeof noLoop === 'function') {
            noLoop();
        }
        // 最後再畫一次靜態畫面以確保文字/圖形維持顯示
        redraw();
    }
}
