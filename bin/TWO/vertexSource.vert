#version 330 core										 
layout(location = 0) in vec3 aPos;						
//layout(location = 1) in vec3 aColor;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aTexCoord;



out vec4 vertexColor;									
out vec2 TexCoord;
out vec3 FragPos;
out vec3 Normal;


//矩阵变化,矩阵 * 向量即为变化后的向量顶点
//uniform mat4 transform;
uniform mat4 modelMat;
uniform mat4 viewMat;
uniform mat4 projMat;
uniform bool DrawLine;
float offent = 1.0f;

void main() {	
		vec3 bPos = aPos;//用于可修改的
		if(DrawLine == true)bPos = bPos +( aNormal * offent);
		gl_Position =  projMat * viewMat * modelMat * vec4(bPos, 1.0); 
		//vertexColor = vec4(aColor.x,aColor.y,aColor.z,1.0);			
		//TexCoord = aTexCoord;
		FragPos = (modelMat * vec4(bPos, 1.0)).xyz;

		
		//这是之前的计算表达式,这里拉伸会导致图像很奇怪,所以处理一下  ->不会
		//Normal = mat3(modelMat) * aNormal;

		//前面的处理都是在处理视角变化+拉伸处理
		Normal = mat3(transpose(inverse(modelMat))) * aNormal;
	
		TexCoord = aTexCoord;
}				


















