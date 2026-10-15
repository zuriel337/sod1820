// Test boundary only. All descendants inherit this guard, including curl/Chromium.
// CI also runs in a network namespace with only loopback. Never a product control.
#define _GNU_SOURCE
#include <arpa/inet.h>
#include <dlfcn.h>
#include <errno.h>
#include <fcntl.h>
#include <netdb.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/uio.h>
#include <unistd.h>
static void violation(const char *kind, const char *host, unsigned port) {
  const char *file=getenv("SOD_CI_AUDIT");
  if(file){int fd=open(file,O_WRONLY|O_APPEND|O_CLOEXEC);if(fd>=0){dprintf(fd,"native:%s %s:%u pid=%d\n",kind,host,port,getpid());close(fd);}}
}
// UDP connect only selects a peer/route and sends no packet (Chromium probes
// IPv6 reachability this way). Validate at send, including connected datagrams.
static int datagram(int fd){int type=0;socklen_t n=sizeof(type);return getsockopt(fd,SOL_SOCKET,SO_TYPE,&type,&n)==0&&type==SOCK_DGRAM;}
static int permitted(const struct sockaddr *sa, socklen_t len) {
  if(!sa || sa->sa_family==AF_UNIX || sa->sa_family==AF_NETLINK) return 1;
  char ip[INET6_ADDRSTRLEN]="unknown"; unsigned port=0; int loopback=0;
  if(sa->sa_family==AF_INET && len>=sizeof(struct sockaddr_in)) {
    const struct sockaddr_in *s=(const void*)sa;inet_ntop(AF_INET,&s->sin_addr,ip,sizeof(ip));port=ntohs(s->sin_port);loopback=!strcmp(ip,"127.0.0.1");
  } else if(sa->sa_family==AF_INET6 && len>=sizeof(struct sockaddr_in6)) {
    const struct sockaddr_in6 *s=(const void*)sa;inet_ntop(AF_INET6,&s->sin6_addr,ip,sizeof(ip));port=ntohs(s->sin6_port);loopback=!strcmp(ip,"::1")||!strcmp(ip,"::ffff:127.0.0.1");
  } else {violation("unsupported-address",ip,port);return 0;}
  if(loopback){
    const char *file=getenv("SOD_CI_PORTS");FILE *f=file?fopen(file,"r"):NULL;
    if(f){unsigned allowed;while(fscanf(f,"%u",&allowed)==1)if(allowed==port){fclose(f);return 1;}fclose(f);}
  }
  violation("connect-denied",ip,port);return 0;
}
int connect(int fd,const struct sockaddr *sa,socklen_t len){
  static int(*real)(int,const struct sockaddr*,socklen_t);if(!real)real=dlsym(RTLD_NEXT,"connect");
  if(!datagram(fd)&&!permitted(sa,len)){errno=EACCES;return -1;}return real(fd,sa,len);
}
static int peerPermitted(int fd){
  if(!datagram(fd))return 1;
  struct sockaddr_storage sa;socklen_t len=sizeof(sa);
  return getpeername(fd,(struct sockaddr*)&sa,&len)!=0||permitted((struct sockaddr*)&sa,len);
}
// Connected UDP also accepts write/writev. Inspect the peer at every packet
// transmission, while leaving packetless connect probes and ordinary files alone.
ssize_t write(int fd,const void *buf,size_t n){
  static ssize_t(*real)(int,const void*,size_t);if(!real)real=dlsym(RTLD_NEXT,"write");
  int saved=errno;if(!peerPermitted(fd)){errno=EACCES;return -1;}errno=saved;
  return real(fd,buf,n);
}
ssize_t writev(int fd,const struct iovec *iov,int count){
  static ssize_t(*real)(int,const struct iovec*,int);if(!real)real=dlsym(RTLD_NEXT,"writev");
  int saved=errno;if(!peerPermitted(fd)){errno=EACCES;return -1;}errno=saved;
  return real(fd,iov,count);
}
ssize_t send(int fd,const void *buf,size_t n,int flags){
  static ssize_t(*real)(int,const void*,size_t,int);if(!real)real=dlsym(RTLD_NEXT,"send");
  if(!peerPermitted(fd)){errno=EACCES;return -1;}return real(fd,buf,n,flags);
}
ssize_t sendto(int fd,const void *buf,size_t n,int flags,const struct sockaddr *sa,socklen_t len){
  static ssize_t(*real)(int,const void*,size_t,int,const struct sockaddr*,socklen_t);if(!real)real=dlsym(RTLD_NEXT,"sendto");
  if((sa&&!permitted(sa,len))||(!sa&&!peerPermitted(fd))){errno=EACCES;return -1;}return real(fd,buf,n,flags,sa,len);
}
ssize_t sendmsg(int fd,const struct msghdr *msg,int flags){
  static ssize_t(*real)(int,const struct msghdr*,int);if(!real)real=dlsym(RTLD_NEXT,"sendmsg");
  if((msg->msg_name&&!permitted(msg->msg_name,msg->msg_namelen))||(!msg->msg_name&&!peerPermitted(fd))){errno=EACCES;return -1;}return real(fd,msg,flags);
}
int getaddrinfo(const char *name,const char *service,const struct addrinfo *hints,struct addrinfo **res){
  static int(*real)(const char*,const char*,const struct addrinfo*,struct addrinfo**);if(!real)real=dlsym(RTLD_NEXT,"getaddrinfo");
  struct in_addr a;struct in6_addr b;
  if(name && strcmp(name,"localhost") && inet_pton(AF_INET,name,&a)!=1 && inet_pton(AF_INET6,name,&b)!=1){violation("dns-denied",name,0);return EAI_FAIL;}
  return real(name,service,hints,res);
}

int sendmmsg(int fd,struct mmsghdr *messages,unsigned count,int flags){
  static int(*real)(int,struct mmsghdr*,unsigned,int);if(!real)real=dlsym(RTLD_NEXT,"sendmmsg");
  for(unsigned i=0;i<count;i++){
    struct msghdr *m=&messages[i].msg_hdr;
    if((m->msg_name&&!permitted(m->msg_name,m->msg_namelen))||(!m->msg_name&&!peerPermitted(fd))){errno=EACCES;return -1;}
  }
  return real(fd,messages,count,flags);
}
