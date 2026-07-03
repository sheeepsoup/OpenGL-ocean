#version 330 core		

in vec3 FragPos;
in vec3 Normal;
//纹理坐标
in vec2 TexCoord;

out vec4 FragColor;		



//材质
struct Material{
	//环境光
	vec3 ambient;
	//纹理[漫反射]
	/*
	这可以理解成物体颜色,改成纹理就是物体颜色

	*/
	sampler2D diffuse;
	//镜面反射    这里通过纹理传入,黑色部分为不反射的地方,其他为可以反射的(可以理解为额外叠加的蒙版,不会画出来,只会用作反光)
	/*
	例如:这里我边框是白色,中间是黑色
	那么结果就是只有边框在反射

	由于计算是 *  只要为0就会没有反光

	*/
	sampler2D specular;
	//照耀程度
	float shininess;

};
uniform Material material;





//灯光/物体颜色
//物体基础颜色
uniform vec3 objColor;
//环境光颜色
uniform vec3 anibentColor;

//摄像机位置
uniform vec3 cameraPos;





//反射贴图,采取天空盒的
uniform samplerCube skybox;
//折射度
float ratio = 1.00 / 1.52;
void main() {	
	//最后的颜色
	vec3 finalRuslt = {0,0,0};
	vec3 uNormal = normalize(Normal);//单位法向量
	vec3 dirToCamera = normalize(cameraPos - FragPos);//到相机的单位向量
	
	//绘制体积云




	
	FragColor =	texture(material.diffuse,TexCoord);

}		














