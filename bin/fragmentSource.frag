#version 330 core						
in vec4 vertexColor;	
in vec2 TexCoord;
out vec4 FragColor;		
uniform sampler2D ourTexture;
void main() {	
		// 翻转 v 坐标
	    vec2 flippedTexCoord = vec2(TexCoord.x, 1.0 - TexCoord.y);
    
		FragColor = texture(ourTexture,flippedTexCoord);
		
}		














/*
10~11
#version 330 core						
in vec4 vertexColor;	
in vec2 TexCoord;
out vec4 FragColor;		
uniform sampler2D ourTexture;
uniform sampler2D ourFace;
void main() {	
		// 翻转 v 坐标
	    vec2 flippedTexCoord = vec2(TexCoord.x, 1.0 - TexCoord.y);
    
		FragColor = texture(ourTexture,flippedTexCoord) * texture(ourFace,flippedTexCoord);

}		



*/


/*
13
#version 330 core						
in vec4 vertexColor;	
in vec2 TexCoord;
out vec4 FragColor;		
uniform sampler2D ourTexture;
uniform sampler2D ourFace;
void main() {	
		// 翻转 v 坐标
	    vec2 flippedTexCoord = vec2(TexCoord.x, 1.0 - TexCoord.y);
    
		FragColor = texture(ourTexture,flippedTexCoord) * texture(ourFace,flippedTexCoord);
		
}		


*/

/*
14
#version 330 core						
in vec4 vertexColor;	
in vec2 TexCoord;
out vec4 FragColor;		
uniform sampler2D ourTexture;
uniform sampler2D ourFace;
void main() {	
		// 翻转 v 坐标
	    vec2 flippedTexCoord = vec2(TexCoord.x, 1.0 - TexCoord.y);
    
		FragColor = texture(ourTexture,flippedTexCoord) * texture(ourFace,flippedTexCoord);
		
}		




*/

/*
15
#version 330 core						
in vec4 vertexColor;	
in vec2 TexCoord;
out vec4 FragColor;		
uniform sampler2D ourTexture;
void main() {	
		// 翻转 v 坐标
	    vec2 flippedTexCoord = vec2(TexCoord.x, 1.0 - TexCoord.y);
    
		FragColor = texture(ourTexture,flippedTexCoord);
		
}		



*/