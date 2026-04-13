import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    tap({
      error: (err) => {
        if (err.status === 401) {
          window.location.reload();
        }
      },
    }),
  );
