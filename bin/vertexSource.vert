#version 330 core										 
layout(location = 0) in vec3 aPos;						
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec2 aTexCoord;
out vec4 vertexColor;									
out vec2 TexCoord;

//矩阵变化,矩阵 * 向量即为变化后的向量顶点
//uniform mat4 transform;
uniform mat4 modelMat;
uniform mat4 viewMat;
uniform mat4 projMat;


void main() {											 
		gl_Position =  projMat * viewMat * modelMat * vec4(aPos, 1.0); 
		vertexColor = vec4(aColor.x,aColor.y,aColor.z,1.0);			
		TexCoord = aTexCoord;
}				












/*
10~11
#version 330 core										 
layout(location = 0) in vec3 aPos;						
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec2 aTexCoord;
out vec4 vertexColor;									
out vec2 TexCoord;
void main() {											 
		gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0); 
		vertexColor = vec4(aColor.x,aColor.y,aColor.z,1.0);			
		TexCoord = aTexCoord;
}														 





*/
/*
13
#version 330 core										 
layout(location = 0) in vec3 aPos;						
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec2 aTexCoord;
out vec4 vertexColor;									
out vec2 TexCoord;

//矩阵变化,矩阵 * 向量即为变化后的向量顶点
uniform mat4 transform;

void main() {											 
		gl_Position = transform * vec4(aPos, 1.0); 
		vertexColor = vec4(aColor.x,aColor.y,aColor.z,1.0);			
		TexCoord = aTexCoord;
}				



*/

/*
15
#version 330 core										 
layout(location = 0) in vec3 aPos;						
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec2 aTexCoord;
out vec4 vertexColor;									
out vec2 TexCoord;

//矩阵变化,矩阵 * 向量即为变化后的向量顶点
//uniform mat4 transform;
uniform mat4 modelMat;
uniform mat4 viewMat;
uniform mat4 projMat;


void main() {											 
		gl_Position =  projMat * viewMat * modelMat * vec4(aPos, 1.0); 
		vertexColor = vec4(aColor.x,aColor.y,aColor.z,1.0);			
		TexCoord = aTexCoord;
}				


*/