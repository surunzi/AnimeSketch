/**
 * @namespace 主控程序
 */

var animeSketch = {
    /** 画布 */
    canvas: null,
    /** 画布内容 */
    ctx: null,
    /** 图片 */
    img: null,
    /** 图片是否已加载 */
    imgLoaded: false,
    /** 图片数据 */
    imgData: null,
    /** 文件读取器 */
    reader: null,
    /** 处理结果图片 */
    $sketchResult: null,
    /** 文件 */
    file: null,
    /** 初始化 */
    init: function() {
        // 画布
        this.canvas = document.getElementById('sketch-canvas');
        this.ctx = this.canvas.getContext('2d');
        // Jquery
        this.$sketchResult = $('#sketch-result');
        // 读取器
        this.reader = new FileReader();
        this.reader.onload = function(e) {
            animeSketch.img.src = e.target.result;
        }
        this.reader.onerror = function() {
            setStatus('文件读取失败...>_<');
        }
        // 图片
        this.img = new Image();
        this.img.onload = function() {
            if (animeSketch.imgLoaded == false) {
                animeSketch.imgLoaded = true;
                $('#front-img').addClass('hidden');
            }
            animeSketch.start();
        }
        // 文件
        this.file = document.getElementById('file');
        this.bindEvent();
        this.controller.init();
    },
    /** 绑定事件 */
    bindEvent: function() {
        document.addEventListener('drop', function(e) {
            animeSketch.onDocumentDrop(e);
        }, false);
        document.addEventListener("dragenter", this.dragAndDropCommon, false);
        document.addEventListener("dragexit", this.dragAndDropCommon, false);
        document.addEventListener("dragover", this.dragAndDropCommon, false);
        this.file.addEventListener("change", function(e) {
            animeSketch.loadImg(animeSketch.file.files);
        });
        $('#front-img').on('click', function() {
            animeSketch.file.click();
        });
        $('#sketch-result').on('click', function() {
            animeSketch.file.click();
        });
    },
    /** 生成图片 */
    copyToImg: function() {
        this.$sketchResult.attr('src', this.canvas.toDataURL('image/png'));
    },
    /** 其它拖曳函数，防止冒泡和拖曳行为 */
    dragAndDropCommon: function(e) {
        e.stopPropagation();
        e.preventDefault();
    },
    /** 绘制 */
    drawOrigin: function() {
        this.ctx.drawImage(this.img, 0, 0);
    },
    /** 绘制结果 */
    drawResult: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(this.imgData, 0, 0);
    },
    /**
     * 高斯模糊
     * @param {Number} width 宽
     * @param {Number} height 高
     * @param {Number} radius 模糊半径
     */
    gaussBlur: function(pixes, width, height, radius) {
        var gaussMatrix = [],
            gaussSum = 0,
            x, y,
            r, g, b, a,
            i, j, k, len;
        sigma = radius / 3;
        a = 1 / (Math.sqrt(2 * Math.PI) * sigma);
        b = -1 / (2 * sigma * sigma);
        //生成高斯矩阵
        for (i = 0, x = -radius; x <= radius; x++, i++){
            g = a * Math.exp(b * x * x);
            gaussMatrix[i] = g;
            gaussSum += g;
        }
        //归一化, 保证高斯矩阵的值在[0,1]之间
        for (i = 0, len = gaussMatrix.length; i < len; i++) {
            gaussMatrix[i] /= gaussSum;
        }
        //x 方向一维高斯运算
        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                r = g = b = a = 0;
                gaussSum = 0;
                for(j = -radius; j <= radius; j++){
                    k = x + j;
                    if(k >= 0 && k < width){//确保 k 没超出 x 的范围
                        //r,g,b,a 四个一组
                        i = (y * width + k) * 4;
                        r += pixes[i] * gaussMatrix[j + radius];
                        g += pixes[i + 1] * gaussMatrix[j + radius];
                        b += pixes[i + 2] * gaussMatrix[j + radius];
                        gaussSum += gaussMatrix[j + radius];
                    }
                }
                i = (y * width + x) * 4;
                // 除以 gaussSum 是为了消除处于边缘的像素, 高斯运算不足的问题
                pixes[i] = r / gaussSum;
                pixes[i + 1] = g / gaussSum;
                pixes[i + 2] = b / gaussSum;
            }
        }
        //y 方向一维高斯运算
        for (x = 0; x < width; x++) {
            for (y = 0; y < height; y++) {
                r = g = b = a = 0;
                gaussSum = 0;
                for(j = -radius; j <= radius; j++){
                    k = y + j;
                    if(k >= 0 && k < height){//确保 k 没超出 y 的范围
                        i = (k * width + x) * 4;
                        r += pixes[i] * gaussMatrix[j + radius];
                        g += pixes[i + 1] * gaussMatrix[j + radius];
                        b += pixes[i + 2] * gaussMatrix[j + radius];
                        gaussSum += gaussMatrix[j + radius];
                    }
                }
                i = (y * width + x) * 4;
                pixes[i] = r / gaussSum;
                pixes[i + 1] = g / gaussSum;
                pixes[i + 2] = b / gaussSum;
            }
        }
    },
    /** 加载图片 */
    loadImg: function(files) {
        var file = files[0];
        if (file.type.indexOf('image') >= 0) {
            this.reader.readAsDataURL(files[0]);
        } else {
            setStatus('文件格式不对哦...>_<');
        }
    },
    /** Drop事件处理函数 */
    onDocumentDrop: function(e) {
        e.stopPropagation();
        e.preventDefault();
        this.loadImg(e.dataTransfer.files);
    },
    /** 处理 */
    process: function() {
        var i, j, len, grayscale, pixels, pixel,
            width = this.canvas.width,
            height = this.canvas.height,
            copyPixels = new Uint8ClampedArray(width * height * 4);
        this.imgData = this.ctx.getImageData(0, 0, width, height);
        pixels = this.imgData.data;
        for (i = 0, len = pixels.length; i < len; i += 4) {
            // 去色
            grayscale = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
            copyPixels[i] = copyPixels[i + 1] = copyPixels[i + 2] =
                pixels[i] = pixels[i + 1] = pixels[i + 2] = grayscale;
            copyPixels[i + 3] = pixels[i + 3];
            // 反相
            copyPixels[i] = 255 - copyPixels[i];
        }
        // 高斯模糊
        this.gaussBlur(copyPixels, width, height, this.controller['粗细']);
        // 颜色减淡
        var brightness = this.controller['亮度'],
            deepen = this.controller['加深'],
            detail = 205 + this.controller['细节'];
        for (i = 0, len = pixels.length; i < len; i += 4) {
            pixel = pixels[i] + (pixels[i] * copyPixels[i]) / (255 - copyPixels[i]);
            // 加亮
            pixel += brightness;
            // 正片叠底，加深线条颜色
            if (pixel < detail) {
                for (j = 0; j < deepen; j++) {
                    pixel = pixel * pixel / 255;
                    if (pixel < 5) {
                        break;
                    }
                }
            }
            if (pixel > 255) {
                pixel = 255;
            }
            pixels[i] = pixels[i + 1] = pixels[i + 2] = pixel;
        }
        this.gaussBlur(pixels, width, height, 2);
    },
    /** 设置画布宽高 */
    setCanvas: function() {
        this.canvas.width = this.img.width;
        this.canvas.height = this.img.height;
    },
    /** 开始执行 */
    start: function() {
        if (this.imgLoaded == true) {
            this.setCanvas();
            this.drawOrigin();
            setStatus('文件处理中...^_^');
            this.process();
            this.drawResult();
            this.copyToImg();
            setStatus('右键"另存为"保存图片...^_^');
        }
    }
}

/** 控制器 */
animeSketch.controller = {
    /** 粗细 */
    '粗细': 2,
    /** 亮度 */
    '亮度': 5,
    /** 细节 */
    '细节': 50,
    /** 加深程度 */
    '加深': 3,
    /** 控制器界面 */
    gui: null,
    /** 执行 */
    '应用': function() {
        animeSketch.start();
    },
    /** 初始化 */
    init: function() {
        this.gui = new dat.GUI();
        this.gui.close();
        this.gui.add(animeSketch.controller, '粗细', 1, 10).step(1);
        this.gui.add(animeSketch.controller, '亮度', 0, 20).step(1);
        this.gui.add(animeSketch.controller, '细节', 0, 50).step(1);
        this.gui.add(animeSketch.controller, '加深', 0, 8).step(1);
        this.gui.add(animeSketch.controller, '应用');
    }
}

animeSketch.init();