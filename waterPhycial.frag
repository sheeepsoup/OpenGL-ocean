//练习海面

//a值返回距离,放在帧缓冲中,下一次运行直接用上次的距离,更快 
#version 330 core

#define MAX_STEP 64//最大步进步数
#define WAVE_NUM 11//波的数量  11
#define CONNECT_DENSITY 0.38//波之间的拖拽力度
#define NORMAL_ITERATIONS 36 // 法线计算专用迭代次数
#define WATER_DEPTH 1.0//水深
#define MAX_DIST 50//迷雾距离



uniform vec3 cameraPos;//摄像机坐标
uniform vec3 Up;//上
uniform vec3 Right;//右
uniform vec3 Forward;//直
uniform float iTime;//时间
uniform mat3 rot;//正方体的旋转矩阵
uniform sampler2D cubeTexture;
uniform sampler2D screenTexture;//帧缓冲屏幕,a存有上一帧距离
uniform sampler2D rainTexture;//雨水涟漪的纹理
uniform sampler2D noiseTex; // 噪声纹理



//海洋迷雾效果
//vec3 fogColor = vec3(0.7, 0.8, 0.9);//迷雾颜色
vec3 fogColor = vec3(0.2, 0.2, 0.2);//迷雾颜色





out vec4 FragColor;//颜色输出
//正方体位置和大小
vec3 CubePos = vec3(0, -1, 0);
vec3 CubeSize = vec3(1, 1, 1);
//太阳方向
vec3 sunDir = normalize(vec3(0.5, -0.5, 0.0)); 
//太阳颜色
vec3 sunColor = vec3(1);


//海洋上平面
vec3 SeaUp = vec3(0);
//海洋下平面
vec3 SeaDown = vec3(1.0, 0.9, 0.7) * 0.8;




//下雨机制--------------------------------------------------------------
//取余函数
float GetQuYu(float value1, float value2) {
    if (value2 <= 0.0) {
        return 0.0;
    }
    while (value1 >= value2) {
        value1 -= value2;
    }
    return value1;
}
//获取纹理的UV
vec2 GetRainCoord(vec2 nowPos){
 

	float PlaySeed = 0.1;     // 播放速度（必须 > 0）
	int picNum = 20;          // 图片总数
	// 新增缩放系数（值越小涟漪越大）
	float rippleScale = 0.35; // 0.1~1.0
		  // 计算当前帧索引 (0 ~ picNum-1)
    float totalDuration = PlaySeed * float(picNum);
    float cycleTime = mod(iTime, totalDuration); // 循环时间
    int nowPic = int(floor(cycleTime / PlaySeed)); // 当前帧索引



    // 计算基础UV（确保在[0,1]范围）
    vec2 baseUV = vec2(
        GetQuYu(nowPos.x * rippleScale, 1.0), 
        GetQuYu(nowPos.y * rippleScale, 1.0)
    );
	   // 计算基础UV（确保在[0,1]范围）
    vec2 baseUVa = vec2(
        GetQuYu(nowPos.x * rippleScale, 1.0), 
        GetQuYu(nowPos.y * rippleScale, 1.0)
    );
    // 计算序列帧UV
    float frameWidth = 1.0 / float(picNum);
    vec2 ATexCoord = vec2(
        baseUV.x * frameWidth + frameWidth * float(nowPic), // 横向偏移
        baseUV.y // 纵向不变
    );

	return ATexCoord;
}

//渲染下雨效果
vec3 randerRain(vec2 uv) {
    uv.y += 0.5;
    
    // 雨水的世界空间方向（向下倾斜）
    vec3 rainWorldDir = normalize(vec3(0.2, -1.0, 0.0));
    
    // 转换到视图空间
    vec3 rainViewDir = normalize(Right * rainWorldDir.x + Up * rainWorldDir.y + Forward * rainWorldDir.z);
    
    // 确保雨滴总是向下移动（y分量始终为负）
    rainViewDir.y = -abs(rainViewDir.y);  // 强制向下
    
    vec2 rainDir = normalize(rainViewDir.xz);
    
    vec3 col = vec3(0.0);
    float rainIntensity = 0.5;
    float rainSpeed = 0.12;
    float rainDensity = 12.0;
    
    float dis = 1.0;
    for (int i = 0; i < int(rainDensity); i++) {
        // 修改运动计算，确保时间因子总是正向
        vec2 st = dis * (uv * vec2(1.5, 0.05) + 
                 vec2(-iTime * rainSpeed * sign(rainDir.x) * abs(rainDir.x) + uv.y * 0.5 * rainDir.y, 
                      iTime * 0.12 * abs(rainDir.y)));
        
        float f = (texture(noiseTex, st * 0.5, -99.0).x + 
                  texture(noiseTex, st * 0.284, -99.0).y);
        
        f = clamp(pow(abs(f) * 0.5, 29.0) * 140.0 * rainIntensity, 0.00, uv.y * 0.4 + 0.05);
        col += vec3(0.25) * f;
        dis += 3.5;
    }
    
    if(uv.y > -0.0) return col;
    else return vec3(0.0);
}










//下雨机制完毕-------------------------------------------------------

//获取视线到海洋的距离  输入当前视线方向 某个平面的坐标
//这里现放一放,我的计算方式出错了,先抄
// 光线与平面相交检测
float intersectPlane(vec3 origin, vec3 direction, vec3 point, vec3 normal) { 
    return clamp(dot(point - origin, normal) / dot(direction, normal), -1.0, 9991999.0); 
}

//物理机制
//-----------------------------------------------------------------------------------
// 旋转矩阵（绕 Y 轴旋转）
mat3 RotateY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
    );
}
// 绕 X 轴旋转
mat3 RotateX(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
    );
}
// 绕 Z 轴旋转
mat3 RotateZ(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        c, -s, 0.0,
        s, c, 0.0,
        0.0, 0.0, 1.0
    );
}
// 获取 SDF 距离
// 计算光线与旋转立方体的交点距离
float GetCubeDist(vec3 rayDir,vec3 start) {
   
  
 
    // 将光线和相机位置转换到立方体的局部坐标系（考虑旋转）
    vec3 localRayOrigin = rot * (start - CubePos);
    vec3 localRayDir = rot * rayDir;
    
    // 计算 AABB（轴对齐包围盒）的相交距离
    vec3 invRayDir = 1.0 / localRayDir; // 避免除以零
    vec3 t0 = (-CubeSize - localRayOrigin) * invRayDir;
    vec3 t1 = (CubeSize - localRayOrigin) * invRayDir;
    
    // 计算进入和退出距离
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    
    // 最近的进入距离是三个轴的最大值
    float enterDist = max(max(tmin.x, tmin.y), tmin.z);
    
    // 最远的退出距离是三个轴的最小值
    float exitDist = min(min(tmax.x, tmax.y), tmax.z);
    
    // 如果退出距离 < 进入距离，说明没有相交
    if (exitDist < enterDist || exitDist < 0.0) {
        return -1.0; // 未命中
    }
    
    // 返回进入距离（如果为正，表示相交）
    return (enterDist > 0.0) ? enterDist : exitDist;
}
//不相交的时候返回距离的函数
float GetCubeDistNoAgainst(vec3 rayDir, vec3 start) {
    // 将光线和相机位置转换到立方体的局部坐标系（考虑旋转）
    vec3 localRayOrigin = rot * (start - CubePos);
    vec3 localRayDir = rot * rayDir;
    
    // 计算 AABB（轴对齐包围盒）的相交距离
    vec3 invRayDir = 1.0 / localRayDir; // 避免除以零
    vec3 t0 = (-CubeSize - localRayOrigin) * invRayDir;
    vec3 t1 = (CubeSize - localRayOrigin) * invRayDir;
    
    // 计算进入和退出距离
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    
    // 最近的进入距离是三个轴的最大值
    float enterDist = max(max(tmin.x, tmin.y), tmin.z);
    
    // 最远的退出距离是三个轴的最小值
    float exitDist = min(min(tmax.x, tmax.y), tmax.z);
    
    // 如果有相交，返回进入距离（如果为正）或退出距离
    if (exitDist >= enterDist && exitDist >= 0.0) {
        return (enterDist > 0.0) ? enterDist : exitDist;
    }
    
    // 如果不相交，计算到立方体的最小距离
    // 首先计算光线到立方体各面的最近点
    vec3 closestPoint = max(min(localRayOrigin, CubeSize), -CubeSize);
    
    // 然后计算距离
    return length(closestPoint - localRayOrigin) / length(localRayDir);
}


//获取与海面的距离  x(1为正方体,0为海面)  y距离
vec2 GetDist(vec3 dir,vec3 falt,vec3 start){
	float cubeDist = GetCubeDist(dir,cameraPos);
	if(cubeDist < 0){//代表没相交.直接返回海面
		return vec2(0,cubeDist);//第二个值返回距离,用于判断和立方体的距离
		
	}
	float seaDist = intersectPlane(cameraPos,dir,SeaUp,vec3(0.0, 1.0, 0.0));
	//获取到海面的确切距离
	vec3 SeaPoint = vec3(start + normalize(dir) * seaDist);
	



	 // 如果立方体可见且比海面更近
    if (cubeDist > 0.0 && (seaDist < 0.0 || cubeDist < seaDist)) {
        return vec2(1.0, cubeDist); // 返回立方体
    }
    // 如果海面可见
    else if (seaDist > 0.0) {
        return vec2(0.0, seaDist);  // 返回海面
    }
    // 都不可见
    return vec2(-1.0);
}
// 计算点到旋转立方体的距离
float distanceToCube(vec3 point) {
    // 将点转换到立方体的局部坐标系（考虑旋转）
    vec3 localPoint = rot * (point - CubePos);
    
    // 计算点到AABB的最近点
    vec3 closest = clamp(localPoint, -CubeSize, CubeSize);
    
    // 返回距离
    return length(localPoint - closest);
}


//物理机制完毕-------------------------------------------------------------------------

//返回x高度 y斜率
//标准不在影响的波	 波的方向  取样坐标   密度		时间
vec2 GetCeritaWave(vec2 dir,vec2 pos,float density,float Time){
	float x = (dot(dir, pos) *density) +  Time;
	/*
	岩浆
	float wave = pow(abs(sin(x)), 0.5); // 0.5会让波峰更尖
    float dx = 0.5 * pow(abs(sin(x)), -0.5) * cos(x); // 导数
    return vec2(wave, dx);
	*/
	float wave = exp(sin(x) - 1.0);

	float dx = wave * cos(x);//高度的导数
	//加上-dx返回,使得斜率 = 1的时候往回拖拽,造成尖端变更尖锐
	return vec2(wave,-dx);//返回当前波方向坐标的值
	
}


//获取海浪高度   当前坐标		波浪数量    模式[0]计算海洋 [1]计算法线
float getSeaHigh(vec2 pos, int iterations,int pattern) {
	//当前的海波方向
	float nowiust = 0;//当前主波的随机叠加时刻

	float LastHigh = 0;//最后的高度
	float ALLWight = 0;//最后的总权重
	float wight = 2.0;//初始权重
	float density = 1.0;//波长

	//距离时刻叠加
	float timeMultiplier = 2.0;

	
	//添加涟漪效果
	vec4 aRainTexture = texture(rainTexture,GetRainCoord(pos.xy));//当前位置的涟漪纹理

	// 检查是否在XZ平面投影范围内,若在则说明在正方体内部,直接退出
	bool insideProjection = 
	abs(pos.x) < CubeSize.x && 
	abs(pos.y) < CubeSize.z;
	if(insideProjection)return -20;//返回一个看不到的距离

	
	//根据距离修正循环次数[越远越不精细(只对法线)]
	float distFix ;//0~1
	int NowNNum;//现在的循环次数
	if(pattern == 1) {
		distFix = 1 - smoothstep(1,60,length(pos - cameraPos.xz));
		NowNNum = int(distFix * iterations + 1);
	}


	if(pattern == 0)NowNNum = iterations;
	for(int i = 0;i<NowNNum;i++) {
			//随机生成波浪方向
		vec2 waveDir = vec2(sin(nowiust),cos(nowiust));//波浪方向
		vec2 high = GetCeritaWave(waveDir,pos,density,iTime + timeMultiplier);//当前取样点的高度
	
		LastHigh += high.x * wight;
		ALLWight += wight;
		wight = mix(wight,0,0.2);//权重--
		
		pos +=  waveDir * high.y * wight * CONNECT_DENSITY;//海浪的拖拽

		density *= 1.18;  // 波长变化
		nowiust+= 1232.399963;//下一次波的随机叠加时刻
		timeMultiplier *= 1.07;//距离越远越好
		
		
	}	
	

	//最后结果
	float result = LastHigh / ALLWight;

	result -= aRainTexture.r / 2;
	
	return result - 1;
}

//rayMarching,传入射线方向  当前的uv
//返回距离 x距离  y海高度 z[0]绘画海面  [1]绘画正方体   [2]绘画海面且当前点可见立方体
vec3 rayMarching(vec3 dir,vec2 uv) {
	//获取到海洋上平面的距离
	float Updistancea = intersectPlane(cameraPos,dir,SeaUp,vec3(0.0, 1.0, 0.0));
	//获取到下平面的距离
	float Downdistance = intersectPlane(cameraPos,dir,SeaDown,vec3(0.0, 1.0, 0.0));

		//计算看是看到了海面还是看到了正方体
	vec2 cubeDist = GetDist(dir,SeaUp,cameraPos);
	//开始步进
	vec3 start = cameraPos + normalize(dir) * Updistancea;


	if(cubeDist.x == 0) {//说明看到了海面

		//接下来还要在内部判断与正方体的距离来绘画细节
		float CubeDista = GetCubeDist(dir,cameraPos);//这个是不管海面纯粹的距离
		if (CubeDista > 50.0) {
			return vec3(0.0, 1.0, 0); // 远处直接返回海面
		}

		for(int i = 0;i<MAX_STEP;i++){
			//获取当前坐标的海浪高度[xy]
			float nowhigh = getSeaHigh(start.xz, WAVE_NUM,0);

			if(start.y <= nowhigh + 0.01){
		
				//说明碰到了真正的海波,返回距离
				float SeaDista = length(cameraPos - start);
				//判断与正方体距离的大小
				if((CubeDista <= SeaDista) && (CubeDista > 0))return  vec3(CubeDista,CubeDista,1);
				else if((CubeDista > SeaDista) && (CubeDista > 0)){return vec3(SeaDista,nowhigh,2);}//看得到
				else if((CubeDista > SeaDista) && (CubeDista <= 0)){return vec3(SeaDista,nowhigh,0);}//看不到立方体
				else{
					return vec3(SeaDista,nowhigh,0);
				}
			}
			start += normalize(dir) * (start.y - nowhigh);//以相撞半径为距离步进
		}
	}
	else if(cubeDist.x == 1) {//看到了正方体
		cubeDist.x = -2;//加负数方便判断是正方体
		return vec3(cubeDist,1);

		
	}
	return vec3(0.0);

}


// 修正后的法线计算
vec3 GetuNormal(vec3 pos, float e, float depth) {
    float H = getSeaHigh(pos.xz, NORMAL_ITERATIONS,1) * depth;
    vec2 ex = vec2(e, 0);
    
    // 使用中心差分法计算法线
    vec3 right = vec3(pos.x + e, getSeaHigh(vec2(pos.x + e, pos.z), NORMAL_ITERATIONS,1) * depth, pos.z);
    vec3 left = vec3(pos.x - e, getSeaHigh(vec2(pos.x - e, pos.z), NORMAL_ITERATIONS,1) * depth, pos.z);
    vec3 front = vec3(pos.x, getSeaHigh(vec2(pos.x, pos.z + e), NORMAL_ITERATIONS,1) * depth, pos.z + e);
    vec3 back = vec3(pos.x, getSeaHigh(vec2(pos.x, pos.z - e), NORMAL_ITERATIONS,1) * depth, pos.z - e);
    
    vec3 dx = right - left;
    vec3 dz = front - back;
    
    return normalize(cross(dz, dx)); // 注意交叉积顺序
}
//正方体的法线
vec3 GetCubeNormal(vec3 pos) {
    // 将位置转换到立方体局部坐标系
    vec3 localPos = rot * (pos - CubePos);
    // 计算AABB的法线
    vec3 absPos = abs(localPos);
    float maxDist = max(max(absPos.x, absPos.y), absPos.z);
    
    if (maxDist == absPos.x) {
        return normalize(rot * vec3(sign(localPos.x), 0.0, 0.0));
    } else if (maxDist == absPos.y) {
        return normalize(rot * vec3(0.0, sign(localPos.y), 0.0));
    } else {
        return normalize(rot * vec3(0.0, 0.0, sign(localPos.z)));
    }
}

//获取折射光线            入射光线    法线    入射介质  折射介质
vec3 calculateRefraction(vec3 ray, vec3 N, float n1, float n2) {
    // 确保入射方向是单位向量
    ray = normalize(ray);
    
    // 计算折射率比
    float eta = n1 / n2;
    
    // 计算入射角余弦
    float cosi = dot(-ray, N);
    
    // 计算折射角余弦
    float k = 1.0 - eta * eta * (1.0 - cosi * cosi);
    
    if (k < 0.0) {
        // 全内反射情况，返回零向量或做其他处理
        return vec3(0.0);
    } else {
        // 计算折射方向
        return eta * ray + (eta * cosi - sqrt(k)) * N;
    }
}

//制作浪花
vec3 madeFlower(vec3 nowPoint, vec3 normal) {
	// 采样雨滴纹理，检查当前点是否有雨滴
    float rainMask = texture(rainTexture, GetRainCoord(nowPoint.xz)).r;
    if (rainMask > 0.1) {
        return vec3(1,0,0); // 雨滴区域不生成浪花
    }
	 // 法线越水平（与垂直方向夹角越大），浪花越强
    float foam = 1.0 - abs(dot(normal, vec3(0, 1, 0)));
    return vec3(foam);

	
}

void main() {



	//上下浮动正方体
	CubePos.y = sin(iTime / 3) / 2 - 0.6;

	vec2 iRect = vec2(800,600);//窗口平面
	//获取光线ray
	vec2 uv = (gl_FragCoord.xy - iRect.xy * 0.5) / iRect.y;//uv
	vec3 ray = normalize(Forward + Right * uv.x - Up * uv.y);
  
	if(ray.y >= 0) {
		//方向看不到海
			FragColor = vec4(0.3255,0.79215,0.7686,0);
			FragColor = vec4(fogColor,1);
		
			return;
	}

	//若距离过远直接返回迷雾

	float seaDist = intersectPlane(cameraPos,ray,SeaUp,vec3(0.0, 1.0, 0.0));//到海面距离,大于设定值直接退出
	if(seaDist > MAX_DIST) {
		FragColor = vec4(fogColor,1);
		return;
	}
	
	
	//获取距离 x距离 y高度[海浪]   x-1 y距离[正方体]
	vec3 waveHigh = rayMarching(ray,uv);

	//若距离==0则说明是海浪背后的那些,直接返回迷雾
	if(waveHigh.x == 0){

		FragColor = vec4(fogColor ,1);

		return;
	}


	vec3 color = vec3(1);//最终颜色
	vec3 seaN = vec3(0);//海面法线,存在这用于计算浪花

	float dist;//最终距离
	if((waveHigh.z == 0)) {//绘画海面
		
		dist = waveHigh.x ;

		vec3 baseColor = mix(vec3(0.0, 0.3, 0.5), vec3(0.2, 0.8, 1.0), waveHigh.y);//海洋基础色调
		//vec3 color = mix(vec3(0.5, 0.0, 0.0), vec3(1.0, 0.2, 0.2), waveHigh.y);

		vec3 WaterPoint = cameraPos + normalize(ray) * dist;//水的碰撞点
		vec3 N = GetuNormal(WaterPoint,0.01 , 1.0);//当前碰撞点的法线
		 // 更柔和的法线混合
		N = mix(N, vec3(0.0, 1.0, 0.0), 0.5 * min(1.0, dist * 0.005)); 
		seaN = N;
		//光照部分--------------
		//菲涅尔效应
		float F0 = 0.04;//垂直观看时候的反射率
		float fresnel = F0 + (1.0 - F0) * pow(1.0 - max(0.0, dot(N, -ray)), 5.0);//菲涅尔系数

		
		//光照先暂时去掉
		//环境光照
		vec3 ambient = vec3(0.1, 0.2, 0.3);

		//Blinn光照模型
		vec3 halfwayDir = normalize(sunDir + ray);
		float spec = pow(max(0.0, dot(N, halfwayDir)), 32.0);
		vec3 specular = sunColor * spec * 0.5;//反射光线

		


		//加上光照
		//vec3 color = baseColor *fresnel ;
		color = mix(vec3(fresnel * 0.5),vec3(0.2, 0.8, 1.0),0.1);
		
		
	
	}
	else if((waveHigh.z == 2)) {
		//绘画折射
		dist = waveHigh.x ;

		vec3 baseColor = mix(vec3(0.0, 0.3, 0.5), vec3(0.2, 0.8, 1.0), waveHigh.y);//海洋基础色调
		//vec3 color = mix(vec3(0.5, 0.0, 0.0), vec3(1.0, 0.2, 0.2), waveHigh.y);

		vec3 WaterPoint = cameraPos + normalize(ray) * dist;//水的碰撞点
		vec3 N = GetuNormal(WaterPoint,0.01 , 1.0);//当前碰撞点的法线
		 // 更柔和的法线混合
		N = mix(N, vec3(0.0, 1.0, 0.0), 0.5 * min(1.0, dist * 0.005)); 
		seaN = N;
		//光照部分--------------
		//菲涅尔效应
		float F0 = 0.04;//垂直观看时候的反射率
		float fresnel = F0 + (1.0 - F0) * pow(1.0 - max(0.0, dot(N, -ray)), 5.0);//菲涅尔系数

		color = mix(vec3(fresnel * 0.5),vec3(0.2, 0.8, 1.0),0.1);

		

		//获取正方体
		vec3 cubeRay = calculateRefraction(ray,N,1.0,1.33);//获取折射光线
		//获取确切的交点
		float cubeGinstDist = GetCubeDist(cubeRay,WaterPoint);
		vec3 cubeGinst = WaterPoint + normalize(cubeRay) * cubeGinstDist;//确切的立方体取样的点
		//获取与立方体的法线
		vec3 cubeN = GetCubeNormal(cubeGinst);

		if(GetCubeDist(cubeRay,cubeGinst) < 0){
			vec3 coow = vec3(0.5);
			//当折射光线没碰撞时,直接绘画海浪
			color = mix(color,fogColor,min(dist/MAX_DIST,1 ));
			FragColor = vec4(color,dist / MAX_DIST);
			
			return;
		}
		//纹理取样
		vec3 Pos = cubeGinst;//碰撞点

		  // 将位置转换到立方体局部坐标系
		vec3 localPos = rot * (Pos - CubePos);
    
		// 计算纹理坐标
		vec2 texCoord;
    
		// 确定哪个面被击中并计算UV坐标
		vec3 absPos = abs(localPos);
		float maxDist = max(max(absPos.x, absPos.y), absPos.z);
    
		if (maxDist == absPos.x) {
			texCoord = localPos.x > 0.0 ? 
					  vec2(-localPos.z, localPos.y) / CubeSize.x : 
					  vec2(localPos.z, localPos.y) / CubeSize.x;
		} 
		else if (maxDist == absPos.y) {
			texCoord = localPos.y > 0.0 ? 
					  vec2(localPos.x, -localPos.z) / CubeSize.y : 
					  vec2(localPos.x, localPos.z) / CubeSize.y;
		} 
		else {
			texCoord = localPos.z > 0.0 ? 
					  vec2(localPos.x, localPos.y) / CubeSize.z : 
					  vec2(-localPos.x, localPos.y) / CubeSize.z;
		}
    
		// 调整UV坐标到0-1范围
		texCoord = texCoord * 0.5 + 0.5;
    
		// 采样纹理
		vec4 texColor = texture(cubeTexture, texCoord);

		//模拟水的吸收
		float depthAtten = exp(-length(cubeGinst) * 0.5); // 衰减系数
		texColor.rgb *= vec3(0.8, 0.9, 1.0) * depthAtten; // 水下的蓝色调7

		//海面到立方体折射点的距离
		float toCubeDist = length(WaterPoint - Pos);
		//根据距离混合颜色
		float fluency = 1.0 - smoothstep(0,0.3,toCubeDist);
		vec3 finalColor = mix(texColor.xyz,color * 1.5,fluency);
	
		

		color = finalColor;

		
		
	} 
	else{//绘画正方体
		
		vec3 Pos = cameraPos + normalize(ray) * waveHigh.y;//碰撞点

		  // 将位置转换到立方体局部坐标系
		vec3 localPos = rot * (Pos - CubePos);
    
		// 计算纹理坐标
		vec2 texCoord;
    
		// 确定哪个面被击中并计算UV坐标
		vec3 absPos = abs(localPos);
		float maxDist = max(max(absPos.x, absPos.y), absPos.z);
    
		if (maxDist == absPos.x) {
			texCoord = localPos.x > 0.0 ? 
					  vec2(-localPos.z, localPos.y) / CubeSize.x : 
					  vec2(localPos.z, localPos.y) / CubeSize.x;
		} 
		else if (maxDist == absPos.y) {
			texCoord = localPos.y > 0.0 ? 
					  vec2(localPos.x, -localPos.z) / CubeSize.y : 
					  vec2(localPos.x, localPos.z) / CubeSize.y;
		} 
		else {
			texCoord = localPos.z > 0.0 ? 
					  vec2(localPos.x, localPos.y) / CubeSize.z : 
					  vec2(-localPos.x, localPos.y) / CubeSize.z;
		}
    
		// 调整UV坐标到0-1范围
		texCoord = texCoord * 0.5 + 0.5;
    
		// 采样纹理
		vec4 texColor = texture(cubeTexture, texCoord);


		//利用blinn光照计算镜面反射
		vec3 N = GetCubeNormal(Pos);//当前碰撞点的法线

		//Blinn光照模型
		vec3 halfwayDir = -normalize(sunDir + ray);
		float spec = pow(max(0.0, dot(N, halfwayDir)), 32.0);
		vec3 specular = sunColor * spec * 0.5;//反射光线

		// 混合纹理颜色和光照
		vec3 finalColor = texColor.rgb * (0.7 + specular);
		//添加迷雾混合效果
		finalColor = mix(finalColor,fogColor,min(waveHigh.y/MAX_DIST,1 ));
		FragColor = vec4(finalColor,waveHigh.y / MAX_DIST);
		//写入深度值方便下一次计算
		return;
	}
	


	//添加迷雾混合效果
	color = mix(color,fogColor,min(dist/MAX_DIST,1 ));
	

	//添加下雨效果
	//color += randerRain(uv);

	
	FragColor = vec4(color,dist/MAX_DIST);
}