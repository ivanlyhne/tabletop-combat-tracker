import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable, EMPTY } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Encounter } from '../../shared/models/encounter.model';

export interface CombatStateMessage {
  encounterId: string;
  eventType: string;
  encounterState: Encounter;
}

@Injectable({ providedIn: 'root' })
export class StompService implements OnDestroy {

  private client: Client;
  private connected$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.client = new Client({
      brokerURL: this.resolveBrokerUrl(),
      reconnectDelay: 5000,
    });

    this.client.onConnect = () => {
      this.connected$.next(true);
    };

    this.client.onDisconnect = () => {
      this.connected$.next(false);
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP error', frame);
      this.connected$.next(false);
    };

    this.client.activate();
  }

  /**
   * Returns an Observable that emits CombatStateMessages for the given encounter.
   * Automatically re-subscribes after reconnects. Unsubscribes from the STOMP
   * topic when the caller unsubscribes (e.g. via takeUntilDestroyed).
   */
  subscribeToEncounter(encounterId: string): Observable<CombatStateMessage> {
    return this.connected$.pipe(
      filter(connected => connected),
      switchMap(() =>
        new Observable<CombatStateMessage>(observer => {
          const sub = this.client.subscribe(
            `/topic/encounter/${encounterId}`,
            (msg: IMessage) => {
              try {
                observer.next(JSON.parse(msg.body) as CombatStateMessage);
              } catch (e) {
                console.error('Failed to parse STOMP message', e);
              }
            }
          );
          // Cleanup: unsubscribe from STOMP topic when Observable is torn down
          return () => sub.unsubscribe();
        })
      )
    );
  }

  ngOnDestroy(): void {
    this.client.deactivate();
  }

  private resolveBrokerUrl(): string {
    const wsUrl = environment.wsUrl;
    if (wsUrl.startsWith('http://') || wsUrl.startsWith('https://')) {
      // Convert http(s) to ws(s)
      return wsUrl.replace(/^http/, 'ws');
    }
    // Relative URL (e.g. '/ws') — derive from current window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${wsUrl}`;
  }
}
