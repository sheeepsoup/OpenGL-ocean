#version 330 core
in vec2 TexCoord;
in vec3 FragPos;
out vec4 FragColor;

uniform vec3 Up;
uniform vec3 Right;
uniform vec3 Forward;
uniform vec3 cameraPos;

uniform float iTime;         // 时间变量
vec2 iResolution = vec2(800,600);   // 屏幕分辨率
uniform vec2 iMouse;        // 鼠标位置

#define MAX_STEP 128
#define DRAG_MULT 0.38      // 波浪拖拽系数,用于控制波浪间相互作用
#define WATER_DEPTH 1.0     // 水深
#define CAMERA_HEIGHT 1.5   // 相机高度
#define ITERATIONS_RAYMARCH 12  // 多少个不同的水波方向,越多性能损耗越大
#define ITERATIONS_NORMAL 36    // 法线计算迭代次数

// 计算波浪值和其导数
vec2 wavedx(vec2 position, vec2 direction, float frequency, float timeshift) {

//这里的x是用于生成的在sin中的位置,其中:
	//dot(direction, position)是用于生成在sin中的某一位置,从position在direction的投影大小,可以做到根据距离流畅的增加位置
	//* frequency用于控制波浪的密度,即sin的w的值,越大频率越高
	//+ timeshift用于随时间动态变化,每次时间++就在sin图中往前走
    float x = dot(direction, position) * frequency + timeshift;
	//exp(2) 结果是 e?
	//这里加个exp为了生成更加尖锐的波浪,若不加则是偏球状的
    float wave = exp(sin(x) - 1.0);//高度





    float dx = wave * cos(x);//高度的导数
    return vec2(wave, -dx);
}

// 通过叠加多个不同参数的波浪来计算水面高度  返回当前点海浪高度
//				水面的水平坐标		有多少个水波方向
float getwaves(vec2 position, int iterations) {
    float wavePhaseShift = length(position) * 0.1;//对于浪距离的随机,防止出现相同的运动状态,距离越大值越大
	float iter = 0.0;//类似随机数[伪],每次+= 1232.399963[这个数sincos变化很大],用于每次循环生成不同方向的波浪
    float frequency = 1.0;//波长
    float timeMultiplier = 2.0;//波随时间变化速度,使得主波浪随时间移动慢,小波浪移动快,符合现实
    float weight = 1.0;//权重值
    float sumOfValues = 0.0;//最后总高度[包括权重]
    float sumOfWeights = 0.0;//除以总权重和,实现平滑的水面
    
    for(int i=0; i < iterations; i++) {
        vec2 p = vec2(sin(iter), cos(iter));//随机生成一个方向波浪
	
        vec2 res = wavedx(position, p, frequency, iTime * timeMultiplier + wavePhaseShift);//存有当前点浪高度和导数
        

		//实现波浪交互 p方向 res.y斜率[斜率越大移动越快]
		//第一次循环为主浪,次数越多浪的影响程度越小[小浪]

		//这里修改取位置是为了让波峰更尖锐,波谷更平坦,防止波谷因为其他波意外尖锐
		//加上波浪之间的相互影响同时还消除了同步性,更加真实
		//若res.y<0  水分子向后移动,则下次取样点向后移动一些位置,模拟回弹
		//若res.y>0  水分子向前移动
        position += p * res.y * weight * DRAG_MULT;//修改下一次浪的起始位置


		//波的最终高度叠加
        sumOfValues += res.x * weight;//高度值,高度 * 权重
        sumOfWeights += weight;//最后的总权重
        
        weight = mix(weight, 0.0, 0.2);//递减权重,每次减少20%
        frequency *= 1.18;//增加波长,让不同的小波都和大波浪不一样
        timeMultiplier *= 1.07;//让小波随时间变得更快[即波速更快]
        iter += 1232.399963;//随机波浪方向[伪随机,每次循环都一样]
    }
    return sumOfValues / sumOfWeights;//总高度*权重 / 权重和  结果是好看的海浪
}

// 光线步进水面
float raymarchwater(vec3 camera, vec3 start, vec3 end, float depth) {
    vec3 pos = start;
    vec3 dir = normalize(end - start);
    
	//开始步进
    for(int i=0; i < MAX_STEP; i++) {
	//*depth将0~1变为实际水深  - depth将海浪下平移一下
        float height = getwaves(pos.xz, ITERATIONS_RAYMARCH) * depth - depth;
        if(height + 0.01 > pos.y) {
            return distance(pos, camera);
        }
        pos += dir * (pos.y - height);
    }
    return distance(start, camera);
}

// 计算法线
vec3 normal(vec2 pos, float e, float depth) {
    vec2 ex = vec2(e, 0);
    float H = getwaves(pos.xy, ITERATIONS_NORMAL) * depth;
    vec3 a = vec3(pos.x, H, pos.y);
    return normalize(
        cross(
            a - vec3(pos.x - e, getwaves(pos.xy - ex.xy, ITERATIONS_NORMAL) * depth, pos.y), 
            a - vec3(pos.x, getwaves(pos.xy + ex.yx, ITERATIONS_NORMAL) * depth, pos.y + e)
        )
    );
}


// 获取光线
vec3 getRay(vec2 fragCoord) {
    // 1. 屏幕坐标 → 标准化设备坐标（NDC）
    vec2 uv = ((fragCoord.xy / iResolution.xy) * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
    
    // 2. 直接返回归一化的射线方向（固定视角）

	//计算光线
	vec3 rayw = (Forward + Right*uv.x - Up * uv.y);

    return normalize(rayw);
}

// 光线与平面相交检测[√]
float intersectPlane(vec3 origin, vec3 direction, vec3 point, vec3 normal) { 
   // return clamp(dot(point - origin, normal) / dot(direction, normal), -1.0, 9991999.0); 

   //求距离
   vec3 ya = vec3(0,-1,0);//向下的向量,用于求serta[视线与y轴的夹角]
   float serta = dot(ya,direction) / length(direction);//夹角
   float h = origin.y - point.y;//高的y
   //利用cos(serta)求距离
   return h / cos(serta);

}

// 简单大气散射效果
vec3 extra_cheap_atmosphere(vec3 raydir, vec3 sundir) {
    float special_trick = 1.0 / (raydir.y * 1.0 + 0.1);
    float special_trick2 = 1.0 / (sundir.y * 11.0 + 1.0);
    float raysundt = pow(abs(dot(sundir, raydir)), 2.0);
    float sundt = pow(max(0.0, dot(sundir, raydir)), 8.0);
    float mymie = sundt * special_trick * 0.2;
    vec3 suncolor = mix(vec3(1.0), max(vec3(0.0), vec3(1.0) - vec3(5.5, 13.0, 22.4) / 22.4), special_trick2);
    vec3 bluesky= vec3(5.5, 13.0, 22.4) / 22.4 * suncolor;
    vec3 bluesky2 = max(vec3(0.0), bluesky - vec3(5.5, 13.0, 22.4) * 0.002 * (special_trick + -6.0 * sundir.y * sundir.y));
    bluesky2 *= special_trick * (0.24 + raysundt * 0.24);
    return bluesky2 * (1.0 + 1.0 * pow(1.0 - raydir.y, 3.0));
} 

// 获取太阳方向
vec3 getSunDirection() {
    return normalize(vec3(-0.0773502691896258 , 0.5 + sin(iTime * 0.2 + 2.6) * 0.45 , 0.5773502691896258));
}

// 获取大气颜色
vec3 getAtmosphere(vec3 dir) {
    return extra_cheap_atmosphere(dir, getSunDirection()) * 0.5;
}

// 获取太阳颜色
float getSun(vec3 dir) { 
    return pow(max(0.0, dot(dir, getSunDirection())), 720.0) * 210.0;
}

// ACES色调映射
vec3 aces_tonemap(vec3 color) {  
    mat3 m1 = mat3(
        0.59719, 0.07600, 0.02840,
        0.35458, 0.90834, 0.13383,
        0.04823, 0.01566, 0.83777
    );
    mat3 m2 = mat3(
        1.60475, -0.10208, -0.00327,
        -0.53108,  1.10813, -0.07276,
        -0.07367, -0.00605,  1.07602
    );
    vec3 v = m1 * color;  
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return pow(clamp(m2 * (a / b), 0.0, 1.0), vec3(1.0 / 2.2));  
}

void main()
{
    // 获取光线
    vec3 ray = getRay(gl_FragCoord.xy);
    
	//用于绘画天空
    if(ray.y >= 0.0) {
        // 如果光线向上，则直接透明度为0
        vec3 C = getAtmosphere(ray) + getSun(ray);
	//  vec3 C = vec3(1);
        FragColor = vec4(aces_tonemap(C * 2.0),0.0);   
        return;
    }

    // 定义水面平面
    vec3 waterPlaneHigh = vec3(0.0, 0.0, 0.0);//最高处,直接从这里开始步进,防止性能消耗
    vec3 waterPlaneLow = vec3(0.0, -WATER_DEPTH, 0.0);//最低处,退出的点,防止性能消耗

    // 定义射线起点
    vec3 origin = cameraPos;

    // 计算相交点
    float highPlaneHit = intersectPlane(origin, ray, waterPlaneHigh, vec3(0.0, 1.0, 0.0));//计算最高平面的相交点,返回距离
    float lowPlaneHit = intersectPlane(origin, ray, waterPlaneLow, vec3(0.0, 1.0, 0.0));//计算最低平面的相交点,返回距离
    vec3 highHitPos = origin + ray * highPlaneHit;//这里直接获取交点坐标
    vec3 lowHitPos = origin + ray * lowPlaneHit;//这里直接获取交点坐标[这里都还是平面]

    // 光线步进水面
    float dist = raymarchwater(origin, highHitPos, lowHitPos, WATER_DEPTH);//步进,返回摄像机到水面确切距离的坐标[这里加上波纹了]
    vec3 waterHitPos = origin + ray * dist;//水面真正的交点

    // 计算法线
    vec3 N = normal(waterHitPos.xz, 0.01, WATER_DEPTH);//计算法线,用于计算光照
    N = mix(N, vec3(0.0, 1.0, 0.0), 0.8 * min(1.0, sqrt(dist*0.01) * 1.1));

    // 计算菲涅尔系数
    float fresnel = (0.04 + (1.0-0.04)*(pow(1.0 - max(0.0, dot(-N, ray)), 5.0)));

    // 反射光线
    vec3 R = normalize(reflect(ray, N));
    R.y = abs(R.y);
    
    // 计算反射和次表面散射
    vec3 reflection = getAtmosphere(R) + getSun(R);
    vec3 scattering = vec3(0.0293, 0.0698, 0.1717) * 0.1 * (0.2 + (waterHitPos.y + WATER_DEPTH) / WATER_DEPTH);

    // 最终颜色
    vec3 C = fresnel * reflection + scattering;
    FragColor = vec4(aces_tonemap(C * 2.0), 1.0);

	float aa = dist;
	aa /= 20;
	
	FragColor =  vec4(scattering,1);

	// 基于波浪高度生成颜色（无光照）
	float waveHeight = getwaves(waterHitPos.xz, ITERATIONS_RAYMARCH);//0~1
	vec3 color = mix(vec3(0.0, 0.3, 0.5), vec3(0.2, 0.8, 1.0), waveHeight);
	FragColor = vec4(color, 1.0);

}