A timeout bounds how long a caller waits. It protects resources and lets the caller choose a
recovery path. A timeout is not evidence that the remote operation never happened: the server may
have completed the operation while its response was lost.
