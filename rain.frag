// 雨水残影效果 - GLSL版本
#version 330 core
uniform float iTime;          // 时间变量
uniform sampler2D noiseTex;   // 噪声纹理
uniform vec3 Forward;         // 摄像机前向向量
uniform vec3 Right;           // 摄像机右向量
uniform vec3 Up;              // 摄像机上向量
vec3 WorldUp = vec3(0,1,0);         // 世界空间上向量 (通常为 vec3(0,1,0))

in vec2 TexCoord;
out vec4 FragColor;

void main() {
    vec2 iRect = vec2(800,600); // 窗口尺寸
    vec2 uv = (gl_FragCoord.xy - iRect.xy * 0.5) / iRect.y;
    
    // 计算基于摄像机方向的屏幕射线
    vec3 ray = normalize(Forward + Right * uv.x - Up * uv.y);
    
    // 计算雨水方向 - 使用世界空间的下落方向
    vec3 rainWorldDir = normalize(vec3(0.2, -1.0, 0.0)); // 轻微倾斜的下落方向
    // 将世界空间方向转换到视图空间
    vec3 rainViewDir = normalize(Right * rainWorldDir.x + Up * rainWorldDir.y + Forward * rainWorldDir.z);
    vec2 rainDir = normalize(rainViewDir.xz); // 使用xz平面投影
    
    vec3 col = vec3(0.0);
    
    // 雨水层参数
    float rainIntensity = 0.5;  // 雨水强度(0-1)
    float rainSpeed = 0.12;     // 雨水下落速度
    float rainDensity = 12.0;   // 雨水层数
    
    // 雨水效果核心代码
    float dis = 1.0;
    for (int i = 0; i < int(rainDensity); i++) {
        // 使用稳定的雨水方向计算
        vec2 st = dis * (uv * vec2(1.5, 0.05) + 
                 vec2(-iTime * rainSpeed * rainDir.x + uv.y * 0.5 * rainDir.y, 
                      iTime * 0.12 * rainDir.y));
        
        // 采样噪声纹理创建雨水图案
        float f = (texture(noiseTex, st * 0.5, -99.0).x + 
                  texture(noiseTex, st * 0.284, -99.0).y);
        
        // 调整雨水视觉效果
        f = clamp(pow(abs(f) * 0.5, 29.0) * 140.0 * rainIntensity, 0.00, uv.y * 0.4 + 0.05);
        
        // 添加雨水到最终颜色
        col += vec3(0.25) * f;
        
        dis += 3.5;  // 下一层雨水距离
    }
    
    // 最终颜色输出
    FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}