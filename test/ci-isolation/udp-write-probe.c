// Local trap probe. Deliberately swallow EACCES: the parent audit must still fail.
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/uio.h>
#include <unistd.h>
int main(int argc,char **argv){
  if(argc!=4)return 2;
  const char *mode=argv[1];int ipv6=!strcmp(argv[2],"::1");
  int fd=socket(ipv6?AF_INET6:AF_INET,SOCK_DGRAM,0);if(fd<0)return 3;
  struct sockaddr_in a={.sin_family=AF_INET,.sin_port=htons(atoi(argv[3]))};
  struct sockaddr_in6 b={.sin6_family=AF_INET6,.sin6_port=htons(atoi(argv[3]))};
  inet_pton(AF_INET,argv[2],&a.sin_addr);inet_pton(AF_INET6,argv[2],&b.sin6_addr);
  if(connect(fd,ipv6?(void*)&b:(void*)&a,ipv6?sizeof(b):sizeof(a)))return 4;
  if(!strcmp(mode,"connect")){close(fd);puts("Child completed: packetless UDP connect");return 0;}
  if(!strcmp(mode,"file")){close(fd);fd=open("ordinary-write-proof.txt",O_CREAT|O_TRUNC|O_WRONLY,0600);if(fd<0)return 5;}
  const char *payload="LOCAL_REVIEW_TRAP";
  struct iovec iov[2]={{.iov_base=(void*)payload,.iov_len=6},{.iov_base=(void*)(payload+6),.iov_len=strlen(payload)-6}};
  ssize_t result=!strcmp(mode,"writev")?writev(fd,iov,2):write(fd,payload,strlen(payload));
  printf("Child completed: %s result=%zd errno=%d\n",mode,result,errno);
  if(!strcmp(mode,"file")&&writev(fd,iov,2)!=(ssize_t)strlen(payload))return 6;
  close(fd);return 0;
}
