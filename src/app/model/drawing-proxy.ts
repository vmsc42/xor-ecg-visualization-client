import { EventEmitter } from "@angular/core";
import {
		XDrawingChange, XDrawingMode, XDrawingProxyState,
		XDrawingClient, XDrawingObject, XDrawingObjectType,
		XDrawingChangeSender
} from "./misc";
import {
		EcgWavePoint, EcgWavePointType, EcgAnnotation,
		EcgSignal, EcgAnnotationCode, EcgLeadCode, EcgRecord
} from "./ecgdata"
import { BehaviorSubject } from "rxjs";

// -------------------------------------------------------------------------------------------------
// DrawingProxy
// -------------------------------------------------------------------------------------------------
export class XDrawingProxy {
		public state: XDrawingProxyState;
		public onChangeState: EventEmitter<XDrawingChange>;
		public drawingObjects: XDrawingObject[];

		//-------------------------------------------------------------------------------------
		constructor() {
				//console.info("DrawingProxy constructor");
				this.init();
		}

		//-------------------------------------------------------------------------------------
		public reset() {
				//console.info("drawing proxy not implemented");
		}

		//-------------------------------------------------------------------------------------
		public scroll(delta: number) {
				this.state.scroll = -delta;
		}

		//-------------------------------------------------------------------------------------
		public buildWavepoints(list: EcgRecord[], client: XDrawingClient) {
				//console.info("prepare wavepoints for client", "create XDrawingObject for eacg  EcgWavePoint element.");
				let o: XDrawingObject;
				// TODO group wavepoints
				for (let z: number = 0; z < list.length - 1; z++) {
						for (let y: number = 0; y < list[z].wavePoints.length; y++) {
								o = XDrawingObject.PreparePqrstComplex(y,
										[list[z].wavePoints[y], list[z].wavePoints[y + 1]],
										[y, y + 1],
										this.state, client, list[z].signal.channels[0].length);
								this.drawingObjects.push(o);
						}
				}
		}

		//-------------------------------------------------------------------------------------
		public buildSignal(list: EcgRecord[], client: XDrawingClient) {
				if (!Array.isArray(list) || !client) return;
				let o: XDrawingObject;
				let s: EcgSignal;
				let skipPx: number = 0;
				for (let z: number = 0; z < list.length; z++) {
						o = XDrawingObject.PrepareSignal(z, list[z].signal, this.state, client, skipPx);
						skipPx = o.container.maxOx;
						this.drawingObjects.push(o);
				}
		}

		//-------------------------------------------------------------------------------------
		public buildBeats(list: EcgRecord[], client: XDrawingClient, pinBeats: boolean) {
				if (!Array.isArray(list) || !client) return;
				let o: XDrawingObject;
				let skipPx: number = 0;
				for (let z: number = 0; z < list.length; z++) {
						if (!Array.isArray(list[z].beats)) continue; // beats

						let signalObjects: XDrawingObject[] = this.findSignal(skipPx, this.state);

						o = XDrawingObject.PrepareBeats(z, signalObjects, list[z].beats, this.state, client, skipPx, list[z].signal.channels[0].length, pinBeats);
						this.drawingObjects.push(o);
						skipPx = o.container.maxOx;
				}
		}

		//-------------------------------------------------------------------------------------
		private findSignal(skipPx: number, state: XDrawingProxyState): XDrawingObject[] {
				let result = new Array();
				for (let z: number = 0; z < this.drawingObjects.length; z++) {
						if (this.drawingObjects[z].container.maxOx < state.minPx
								|| this.drawingObjects[z].container.minOx > state.maxPx
								|| this.drawingObjects[z].type != XDrawingObjectType.Signal) continue;
						result.push(this.drawingObjects[z]);
				}
				return result;
		}


		//-------------------------------------------------------------------------------------
		public buildAnnotations(list: EcgRecord[], client: XDrawingClient) {
				let o: XDrawingObject;
				for (let z: number = 0; z < list.length; z++) {
						for (let y: number = 0; y < list[z].annotations.length; y++) {
								o = XDrawingObject.PrepareAnnotation(z, list[z].annotations[y], this.state, client);
								this.drawingObjects.push(o)
						}
				}
		}

		//-------------------------------------------------------------------------------------
		public addDrawingObject(o: XDrawingObject) {
				this.drawingObjects.push(o);
		}

		//-------------------------------------------------------------------------------------
		private init() {
				this.onChangeState = new EventEmitter<XDrawingChange>();
				this.drawingObjects = [];
				this.state = new XDrawingProxyState();
		}

		//-------------------------------------------------------------------------------------
		private collectChanges(sender: XDrawingChangeSender, event: any = null): XDrawingChange {
				//console.info("collect changes not implemented");
				let result: XDrawingChange = new XDrawingChange();
				result.sender = sender;
				result.curState = this.state;
				result.objects = new Array();
				result.clients = new Array();
				for (let z: number = 0; z < this.drawingObjects.length; z++) {
						if (this.drawingObjects[z].container.maxOx < this.state.minPx || this.drawingObjects[z].container.minOx > this.state.maxPx) continue;
						result.objects.push(this.drawingObjects[z]);
						//if (this.drawingObjects[z].container.left < this.state.skipPx)
				}
				return result;
		}


		//-------------------------------------------------------------------------------------
		public gc() {
				// handle proxy limits
				// remove unused objects
		}


		//-------------------------------------------------------------------------------------
		// Action emmiters
		//-------------------------------------------------------------------------------------

		//-------------------------------------------------------------------------------------
		public refreshDrawings() {
				let changes: XDrawingChange = this.collectChanges(XDrawingChangeSender.UpdateDrawings);
				this.onChangeState.emit(changes);
		}

		//-------------------------------------------------------------------------------------
		public preformClick(event: MouseEvent | TouchEvent) {
				let changes: XDrawingChange = this.collectChanges(XDrawingChangeSender.MouseClick, event);
				this.onChangeState.emit(changes);
		}

		//-------------------------------------------------------------------------------------
		public preformDbClick(event: MouseEvent) {
				let changes: XDrawingChange = this.collectChanges(XDrawingChangeSender.MouseDbClick, event);
				this.onChangeState.emit(changes);
		}


		//-------------------------------------------------------------------------------------
		public performDrag(event: any) {
				let changes: XDrawingChange = this.collectChanges(XDrawingChangeSender.Drag, event);
				this.onChangeState.emit(changes);
		}

		//-------------------------------------------------------------------------------------
		public performMouseMove(event: any) {
				let changes: XDrawingChange = this.collectChanges(XDrawingChangeSender.MouseMove, event);
				this.onChangeState.emit(changes);
		}
}
