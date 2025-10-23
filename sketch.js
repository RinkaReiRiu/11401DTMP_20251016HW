// =================================================================
// sketch.js — updated to place the p5 canvas inside #p5CanvasContainer
// so the fireworks canvas no longer covers other page elements.
// =================================================================

// 全域分數與煙火狀態
let finalScore = 0;
let maxScore = 0;
let scoreText = "";

let fireworks = [];
let gravity;
let fireworkActive = false;

// Helper: get canvas size based on the container element
function getCanvasSize() {
    const container = document.getElementById('p5CanvasContainer');
    if (container) {
        // keep a roughly square canvas fitting container
        const w = Math.max(200, Math.min(container.clientWidth, 900));
        // prefer a square; can be changed to any ratio
        const h = Math.max(200, Math.min(container.clientHeight || w, 900));
        return { w, h };
    }
    // fallback
    return { w: Math.min(windowWidth, 900) / 2, h: Math.min(windowHeight, 900) / 2 };
}

// Listen for H5P messages from iframe
window.addEventListener('message', function (event) {
    // 如果需要，可檢查 event.origin
    const data = event.data;

    if (data && data.type === 'H5P_SCORE_RESULT') {
        finalScore = Number(data.score) || 0;
        maxScore = Number(data.maxScore) || 0;
        scoreText = `最終成績分數: ${finalScore}/${maxScore}`;
        console.log("新的分數已接收:", scoreText);

        let percentage = 0;
        if (maxScore > 0) percentage = (finalScore / maxScore) * 100;

        if (percentage >= 100 && maxScore > 0) {
            spawnFireworks(6);
            fireworkActive = true;
            if (typeof loop === 'function') loop();
        } else {
            // 靜態更新一次
            if (typeof redraw === 'function') redraw();
        }
    }
}, false);


// =================================================================
// p5.js setup / resize / draw
// =================================================================
let cnvElement;

function setup() {
    gravity = createVector(0, 0.25);
    const sz = getCanvasSize();
    cnvElement = createCanvas(sz.w, sz.h);
    // place the canvas inside the page container so it won't cover other elements
    const container = document.getElementById('p5CanvasContainer');
    if (container && cnvElement) {
        cnvElement.parent('p5CanvasContainer');
    }
    colorMode(RGB);
    background(255);
    noLoop(); // 只有需要動畫時才啟動 loop()
}

function windowResized() {
    const sz = getCanvasSize();
    if (typeof resizeCanvas === 'function') {
        resizeCanvas(sz.w, sz.h);
        // 確保文字/圖形立即更新
        if (typeof redraw === 'function') redraw();
    }
}


// =================================================================
// Fireworks implementation (p5-based)
// =================================================================
class Particle {
    constructor(pos, vel, hu, isFirework) {
        this.pos = pos.copy();
        this.vel = vel.copy();
        this.acc = createVector(0, 0);
        this.hu = hu || random(0, 360);
        this.lifespan = 255;
        this.isFirework = !!isFirework;
    }

    applyForce(f) {
        this.acc.add(f);
    }

    update() {
        if (!this.isFirework) {
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
        this.firework = new Particle(createVector(random(width), height), createVector(random(-1, 1), random(-12, -8)), this.hu, true);
        this.exploded = false;
        this.particles = [];
    }

    done() {
        return this.exploded && this.particles.length === 0;
    }

    explode() {
        let n = floor(random(60, 120));
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
            if (this.firework.vel.y >= 0 || random(1) < 0.01) {
                this.exploded = true;
                this.explode();
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.applyForce(gravity.copy().mult(0.2));
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
        for (let p of this.particles) p.show();
    }
}

function spawnFireworks(count) {
    for (let i = 0; i < count; i++) {
        fireworks.push(new Firework());
    }
}

// Expose helper so other scripts can trigger fireworks programmatically
window.triggerGradeFireworks = function (count = 6) {
    spawnFireworks(count);
    fireworkActive = true;
    if (typeof loop === 'function') loop();
};


// =================================================================
// draw loop (p5)
function draw() {
    // 當正在播放煙火且有粒子時，使用深色半透明背景創造拖尾
    if (fireworkActive && fireworks.length > 0) {
        push();
        noStroke();
        fill(0, 0, 0, 60);
        rect(0, 0, width, height);
        pop();
    } else {
        background(255);
    }

    // 計算百分比（避免 /0）
    let percentage = 0;
    if (maxScore > 0) percentage = (finalScore / maxScore) * 100;

    textSize(36);
    textAlign(CENTER);

    // 文字內容 (調小字型以避免遮擋)
    if (percentage >= 90 && percentage < 100) {
        fill(0, 200, 50);
        text("恭喜！優異成績！", width / 2, height / 2 - 30);
    } else if (percentage >= 60) {
        fill(255, 181, 35);
        text("成績良好，請再接再厲。", width / 2, height / 2 - 30);
    } else if (percentage > 0) {
        fill(200, 0, 0);
        text("需要加強努力！", width / 2, height / 2 - 30);
    } else {
        fill(150);
        text(scoreText || "尚未收到成績", width / 2, height / 2 - 30);
    }

    // 顯示具體分數
    textSize(24);
    fill(50);
    text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 10);

    // 根據分數顯示圖形
    if (percentage >= 100 && maxScore > 0) {
        fill(255, 215, 0, 180);
        noStroke();
        circle(width / 2, height / 2 + 90, min(140, width * 0.3));
    } else if (percentage >= 90) {
        fill(0, 200, 50, 150);
        noStroke();
        circle(width / 2, height / 2 + 90, min(120, width * 0.26));
    } else if (percentage >= 60) {
        fill(255, 181, 35, 150);
        rectMode(CENTER);
        rect(width / 2, height / 2 + 90, min(120, width * 0.26), min(120, width * 0.26));
    }

    // 更新並顯示煙火
    if (fireworks.length > 0) {
        for (let i = fireworks.length - 1; i >= 0; i--) {
            let f = fireworks[i];
            f.update();
            f.show();
            if (f.done()) fireworks.splice(i, 1);
        }
    }

    // 如果煙火結束，關閉動畫 loop 以節省資源
    if (fireworkActive && fireworks.length === 0) {
        fireworkActive = false;
        if (typeof noLoop === 'function') noLoop();
        if (typeof redraw === 'function') redraw();
    }
}
