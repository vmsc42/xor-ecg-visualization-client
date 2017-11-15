import {
  Component, OnInit, ElementRef, HostListener,
  ViewChild
} from '@angular/core';
import { XDrawingProxy } from "../model/drawingproxy"
import { DataService } from "../service/data.service"
import {
  XDrawingCell, XDrawingChangeSender, XDrawingGridMode,
  XDrawingChange, XDrawingProxyState, XCanvasTool
} from "../model/misc";
import {
  XDrawingPrimitive, XDrawingPrimitiveState,
  XLabel, XLine, XPeak, XPoint, XPolyline,
  XRectangle
} from "../model/geometry";
import {
  XDrawingClient, XDrawingMode, IDrawingClient,
  AnsDrawingClient, BeatsDrawingClient,
  SignalDrawingClient, CellDrawingClient,
  ClickablePointDrawingClient,
  FPointDrawingClient
} from "../model/drawingclient";
import {
  BeatsDrawingObject, IDrawingObject, ClPointDrawingObject,
  XDrawingObject, XDrawingObjectType, AnsDrawingObject,
  CellDrawingObject, SignalDrawingObject, FPointDrawingObject
} from "../model/drawingobject";
import {
  EcgRecord, EcgSignal, EcgWavePoint, EcgWavePointType,
  EcgAnnotation, EcgAnnotationCode, EcgLeadCode,
} from "../model/ecgdata";
import { Subscription, BehaviorSubject } from "rxjs";

@Component({
  selector: 'app-drawable',
  templateUrl: './drawable.component.html',
  styleUrls: ['./drawable.component.css']
})


// -------------------------------------------------------------------------------------------------
// DrawableComponent
// -------------------------------------------------------------------------------------------------
export class DrawableComponent implements OnInit {

  private _dp: XDrawingProxy;
  private _ansClient: XDrawingClient;
  private _pqrstClient: XDrawingClient;
  private _signalClient: XDrawingClient;
  private _beatsClient: XDrawingClient;
  private _floatingObjectsClient: XDrawingClient;
  private _floatingPeaksClient: XDrawingClient;
  private _gridClient: XDrawingClient;
  // feature 2 clients
  private _signalF2Client: SignalDrawingClient;
  private _beatsF2Client: BeatsDrawingClient;
  private _fpointF2Client: FPointDrawingClient;

  private _fileReader: FileReader;
  private _hideFileDrop: boolean;
  /**Canvas tool. */
  private _ct: XCanvasTool;
  private _loadDataSubs: Subscription;
  private _waveformDragStartPosition: XPoint;
  private _pinBeatsToSignal: boolean;

  private _threshold: number;
  private _lastEmitTime: number;

  //-------------------------------------------------------------------------------------
  @ViewChild("waveformCanvas")
  private _drawingElement: ElementRef;
  @ViewChild("canvasCont")
  private _canvasContainer: ElementRef;

  //-------------------------------------------------------------------------------------
  @HostListener("window:mouseenter", ["$event"])
  private onWindowMouseenter(event: MouseEvent) {
    //console.info("window:mouseenter", event);
    event.preventDefault();
    event.stopPropagation();
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:mouseover", ["$event"])
  private onWindowMouseover(event: MouseEvent) {
    //console.info("window:mouseover", event);
    event.preventDefault();
    event.stopPropagation();
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:mousemove", ["$event"])
  private onWindowMousemove(event: MouseEvent) {
    //console.info("window:mousemove", event);
    //console.info(event);
    event.preventDefault();
    event.stopPropagation();
    this.onDragMove(event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:mousedown", ["$event"])
  private onWindowMousedown(event: MouseEvent) {
    //console.info("window:mousedown", event);
    event.preventDefault();
    event.stopPropagation();
    this.onDragStart(event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:mouseleave", ["$event"])
  private onWindowMouseleave(event: MouseEvent) {
    //console.info("window:mouseleave", event);
    event.preventDefault();
    event.stopPropagation();
    this.onDragEnd(event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:mouseout", ["$event"])
  private onWindowMouse(event: MouseEvent) {
    //console.info("window:mouseout", event);
    event.preventDefault();
    event.stopPropagation();
    this.onDragEnd(event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:mouseup", ["$event"])
  private onWindowMouseup(event: MouseEvent) {
    //console.info("window:mouseup", event);
    event.preventDefault();
    event.stopPropagation();
    this.onDragEnd(event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:auxclick", ["$event"])
  private onWindowAuxclick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    //console.info("window:auxclick", event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:click", ["$event"])
  private onWindowClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    //console.info("window:click", event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:dblclick", ["$event"])
  private onWindowDblclick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    //console.info("window:dblclick", event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:touchcancel", ["$event"])
  private onWindowTouchcancel(event: TouchEvent) {
    //console.info("window:touchcancel", event);
    event.preventDefault();
    event.stopPropagation();
    this.onDragEnd(event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:touchend", ["$event"])
  private onWindowTouchend(event: TouchEvent) {
    //console.info("window:touchend", event);
    event.preventDefault();
    event.stopPropagation();
    this.onDragEnd(event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:touchmove", ["$event"])
  private onWindowTouchmove(event: TouchEvent) {
    //console.info("window:touchmove", event);
    event.preventDefault();
    event.stopPropagation();
    this.onDragMove(event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:touchstart", ["$event"])
  private onWindowTouchstart(event: TouchEvent) {
    //console.info("window:touchstart", event);
    event.preventDefault();
    event.stopPropagation();
    this.onDragStart(event);
  }
  //-------------------------------------------------------------------------------------
  @HostListener("window:resize", ["$event"]) onWindowResize(event: Event) {
    // TODO: fix resize bug
    //console.log("dpr:", window.devicePixelRatio);
    this.prepareCanvasSize();
    this._ct.drawInfo();
  }

  //-------------------------------------------------------------------------------------
  constructor(private _el: ElementRef, private _ds: DataService) {
    //console.info("DrawableComponent constructor");
    this._hideFileDrop = false;
    this._pinBeatsToSignal = true;
    this._loadDataSubs = null;
    this._waveformDragStartPosition = null;
    this._threshold = 100;
    this._lastEmitTime = 0;
    this._dp = new XDrawingProxy();
    this._dp.onChangeState.subscribe((v: XDrawingChange) => this.onProxyStateChanges(v));
    this._dp.onPrepareDrawings.subscribe((v: IDrawingObject[][]) => this.onReceiveDrawingObjects(v));
    this._fileReader = new FileReader();
    this.prepareClients();
    //this._drawingClients = new Array();

    //let clients: IDrawingClient[] = new Array();
    //clients.push(
    //  new XDrawingClient(),
    //  new AnsDrawingClient(),
    //  new BeatsDrawingClient());
    //console.info(clients);
  }

  //-------------------------------------------------------------------------------------
  public ngOnInit() {
    //console.info("DrawableComponent: init");
    this._fileReader.addEventListener("load", this.onLoadFile.bind(this));
    this._loadDataSubs = this._ds.onLoadDataBs.subscribe(v => this.onReceiveData(v as EcgRecord[]));
    this._canvasContainer.nativeElement.addEventListener("dragover", this.onDragOver.bind(this), false);
    this._canvasContainer.nativeElement.addEventListener("drop", this.onDragDrop.bind(this), false);
  }

  //-------------------------------------------------------------------------------------
  public ngAfterContentInit() {
    this._ct = new XCanvasTool(this._drawingElement);
    this.prepareCanvasSize();
    this._dp.state.limitPx = this._ct.width;
    this.prepareGrid();
    this._ct.drawInfo();
  }

  //-------------------------------------------------------------------------------------
  public ngOnDestroy() {
    //console.info("DrawableComponent: destroy");
    if (this._loadDataSubs) this._loadDataSubs.unsubscribe();
  }

  //-------------------------------------------------------------------------------------
  private onDragOver(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  //-------------------------------------------------------------------------------------
  private onDragDrop(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();
    let files: FileList = event.dataTransfer.files;
    this._fileReader.readAsText(files[0]);
  }

  //-------------------------------------------------------------------------------------
  private onDragStart(event: any) {
    this._waveformDragStartPosition = this.getEventPosition(event);
  }

  //-------------------------------------------------------------------------------------
  private onDragMove(event: any) {
    if (!this._waveformDragStartPosition) {
      this.pointerMove(event);
      return;
    }
    this.scroll(event);
  }

  //-------------------------------------------------------------------------------------
  private onDragEnd(event: any) {
    if (!this._waveformDragStartPosition) return;
    this._waveformDragStartPosition = null;
  }

  //----------------------------------------------------------------------------------------------
  private getEventPosition(event: any): XPoint {
    // TODO: handle device pixel ratio
    let left: number = 0, top: number = 0;
    if (event.clientX) {
      left = event.clientX;
      top = event.clientY;
    } else if (event.touches && event.touches[0]) {
      left = event.touches[0].clientX;
      top = event.touches[0].clientY;
    }
    return new XPoint(left, top);
  }

  //-------------------------------------------------------------------------------------
  private onReceiveData(v: EcgRecord[]) {
    if (!v || !Array.isArray(v) || v.length === 0) return;
    // save sample rate in state
    this._dp.state.sampleRate = this._ds.ecgrecords[0].sampleRateForCls;
    // save original sample rate
    this._dp.drawingData.originalSampleRate = this._ds.ecgrecords[0].sampleRateForCls;

    this._dp.drawingData.recordHeaders = this._ds.ecgrecords;
    // on real project we receive data in other place
    this._dp.drawingData.projection = this._ds.ecgrecords;

    this._dp.reset();
    //console.info("receive", v, "prepare drawings");
    this.prepareDrawingObjects();
    this._dp.refreshDrawings();
  }

  //-------------------------------------------------------------------------------------
  public onLoadFile(event: ProgressEvent) {
    this._ds.parseJsonFile(JSON.parse(this._fileReader.result));
  }

  //-------------------------------------------------------------------------------------
  private onProxyStateChanges(change: XDrawingChange) {
    //console.info("onProxyStateChanges:", change);
    // refresh drawings
    this._ct.clear();
    //this._ct.ctx.save();
    //let state: XDrawingProxyState = this._dp.state;
    //this._ct.ctx.rect(state.container.left, state.container.top, state.container.width, state.container.height);
    //this._ct.ctx.stroke();
    //this._ct.ctx.restore();
    for (let z: number = 0; z < change.objects.length; z++) {
      if (!change.objects[z].owner.draw) continue;
      change.objects[z].owner.draw(change.objects[z]);//
    }
  }

  //-------------------------------------------------------------------------------------
  private onReceiveDrawingObjects(p: IDrawingObject[][]) {
    // z: client index
    for (let z: number = 0; z < this._dp.drawingClients.length; z++) {
      if (this._dp.drawingClients[z].drawObjects && Array.isArray(p[z])) {
        if (p[z].length === 0) continue;
        this._dp.drawingClients[z].drawObjects(p[z]);
      }
      else if (this._dp.drawingClients[z].draw) {
        // TODO remove single object drawing method
        this._dp.drawingClients[z].draw(p[z][0]);
      }
    }
  }

  //-------------------------------------------------------------------------------------
  private prepareClients() {
    //this._ansClient = new XDrawingClient();
    //this._ansClient.mode = XDrawingMode.Mix;
    //this._pqrstClient = new XDrawingClient();
    //this._pqrstClient.mode = XDrawingMode.SVG;
    //this._signalClient = new XDrawingClient();
    //this._signalClient.mode = XDrawingMode.Canvas;
    //this._signalClient.draw = this.drawSignal.bind(this);
    //this._beatsClient = new XDrawingClient();
    //this._beatsClient.mode = XDrawingMode.Canvas;
    //this._beatsClient.draw = this.drawBeats.bind(this);
    //this._floatingObjectsClient = new XDrawingClient();
    //this._floatingObjectsClient.mode = XDrawingMode.Canvas;
    //this._floatingObjectsClient.draw = this.drawFloadingPoint.bind(this);
    //this._floatingPeaksClient = new XDrawingClient();
    //this._floatingPeaksClient.mode = XDrawingMode.Canvas;
    //this._floatingPeaksClient.draw = this.drawFloatingPeak.bind(this);

    //this._gridClient = new XDrawingClient();
    //this._gridClient.mode = XDrawingMode.Canvas;

    // prepare feature 2 clients
    this._signalF2Client = new SignalDrawingClient();
    this._signalF2Client.drawObjects = this.drawSignalObjectsF2.bind(this);
    this._beatsF2Client = new BeatsDrawingClient();
    this._beatsF2Client.drawObjects = this.drawBeatsObjectsF2.bind(this);
    this._fpointF2Client = new FPointDrawingClient();
    this._fpointF2Client.drawObjects = this.drawFPointObjectsF2.bind(this);
    this._dp.pushClients(this._signalF2Client, this._beatsF2Client, this._fpointF2Client);
  }

  //-------------------------------------------------------------------------------------
  private prepareDrawingObjects() {
    //this._dp.buildSignal(this._ds.ecgrecords, this._signalClient);
    //this._dp.buildBeats(this._ds.ecgrecords, this._beatsClient, this._pinBeatsToSignal);
    //this._dp.buildFloatingObjects(this._floatingObjectsClient);
    //this._dp.buildFloatingPeaks([this._ds.ecgrecord], this._floatingPeaksClient, 2);
    //this._dp.buildWavepoints(this._ds.ecgrecord.wavePoints, this._pqrstClient);
    //this._dp.buildAnnotations(this._ds.ecgrecord.annotations, this._ansClient);
  }

  //-------------------------------------------------------------------------------------
  private prepareGrid() {
    let leads: EcgLeadCode[] = this._ds.leads;
    let leadsLabels: string[] = this._ds.getLeadCodesLabels(leads);
    this._dp.state.prepareGridCells(leads, leadsLabels);
  }

  //-------------------------------------------------------------------------------------
  private prepareCanvasSize() {
    this._ct.resize(this._el.nativeElement.offsetWidth as number,
      this._el.nativeElement.offsetHeight as number);
    let space: number = 33;
    let proxyContainer: XRectangle = new XRectangle(space, space, this._ct.width - space * 2, this._ct.height - space * 2);
    this._dp.state.container = proxyContainer;
    let clientContainer: XRectangle = new XRectangle(
      space + this._drawingElement.nativeElement.offsetLeft,
      space + this._drawingElement.nativeElement.offsetTop,
      proxyContainer.width,
      proxyContainer.height);
    this._dp.state.screen = clientContainer;
  }

  //-------------------------------------------------------------------------------------
  private drawSignal(obj: XDrawingObject) {
    //console.info("draw singal object", obj);
    let state: XDrawingProxyState = this._dp.state;
    this._ct.ctx.save();
    let skipPoints: number = 0;
    let points: XPoint[];
    let z: number = 0, y: number = 0, left: number = 0, top: number = 0;
    let dy: number;

    this._ct.ctx.beginPath();
    for (z = 0; z < state.gridCells.length; z++) {
      // borders
      this._ct.ctx.moveTo(state.gridCells[z].container.minOx, state.gridCells[z].container.minOy);
      this._ct.ctx.lineTo(state.gridCells[z].container.maxOx, state.gridCells[z].container.minOy);
      this._ct.ctx.lineTo(state.gridCells[z].container.maxOx, state.gridCells[z].container.maxOy);
      this._ct.ctx.lineTo(state.gridCells[z].container.minOx, state.gridCells[z].container.maxOy);
      this._ct.ctx.lineTo(state.gridCells[z].container.minOx, state.gridCells[z].container.minOy);
      // ox axis
      this._ct.ctx.moveTo(state.gridCells[z].container.minOx, state.gridCells[z].container.midOy);
      this._ct.ctx.lineTo(state.gridCells[z].container.maxOx, state.gridCells[z].container.midOy);
    }
    this._ct.ctx.strokeStyle = "red";
    this._ct.ctx.globalAlpha = 0.15;
    this._ct.ctx.closePath();
    this._ct.ctx.stroke();
    this._ct.ctx.closePath();

    this._ct.ctx.beginPath();
    for (z = 0; z < obj.polylines.length; z++) { // z - cell index, polyline index
      points = obj.polylines[z].points;
      y = state.minPx; // y - point index

      left = points[y].left + 0.5 - state.minPx;
      dy = Math.round(points[y].top * state.gridCells[z].microvoltsToPixel);
      top = dy + 0.5 + state.gridCells[z].container.midOy;
      this._ct.ctx.moveTo(left, top);
      for (y++; y < state.maxPx; y++) {
        left = points[y].left + 0.5 - state.minPx;
        dy = Math.round(points[y].top * state.gridCells[z].microvoltsToPixel);
        top = dy + 0.5 + state.gridCells[z].container.midOy;
        this._ct.ctx.lineTo(left, top);
      }
    }
    this._ct.ctx.lineWidth = 1;
    this._ct.ctx.strokeStyle = "#008662";
    this._ct.ctx.globalAlpha = 1;
    this._ct.ctx.stroke();
    this._ct.ctx.closePath();
    this._ct.ctx.restore();
  }

  //-------------------------------------------------------------------------------------
  private drawBeats(obj: XDrawingObject) {
    //console.info("draw beats", obj);

    //let state: XDrawingProxyState = this._dp.state;
    //this._ct.ctx.save();
    //let radius: number = 2;
    //this._ct.ctx.beginPath();
    //let z: number = 0, y: number = 0, left: number = 0, top: number = 0;

    //let cell: XDrawingCell = state.gridCells[0];
    //for (z = 0; z < obj.points.length; z++) {
    //  if (obj.points[z].left < state.minPx + state.container.left + 1) continue;
    //  if (obj.points[z].left > state.maxPx + state.container.left - 1) break;

    //  left = obj.points[z].left - state.minPx;
    //  top = this._pinBeatsToSignal ?
    //    Math.round(obj.points[z].top * state.gridCells[0].microvoltsToPixel) + state.gridCells[0].container.midOy :
    //    obj.container.top + obj.points[z].top;
    //  this._ct.ctx.moveTo(left + 0.5, top + 0.5);
    //  this._ct.ctx.arc(left + 0.5, top + 0.5, radius, 0, 2 * Math.PI, false);
    //}
    //this._ct.ctx.fillStyle = "orange";
    //this._ct.ctx.fill();
    //this._ct.ctx.closePath();
    //this._ct.ctx.restore();
  }

  //-------------------------------------------------------------------------------------
  private drawFloadingPoint(obj: XDrawingObject) {
    // TODO draw point on nearest channel + line in cursor position
    // handle point click
    //console.info("drawFloadingPoint");

    //let state: XDrawingProxyState = this._dp.state;
    //this._ct.ctx.save();
    //let radius: number = 3;
    //let z: number, left: number = 0, top: number = 0;
    //this._ct.ctx.beginPath();
    //if (Array.isArray(obj.lines)) {
    //  for (z = 0; z < obj.lines.length; z++) {
    //    this._ct.ctx.moveTo(obj.lines[0].ax + state.container.left - state.minPx + 0.5, obj.lines[0].ay + 0.5);
    //    this._ct.ctx.lineTo(obj.lines[0].bx + state.container.left - state.minPx + 0.5, obj.lines[0].by + 0.5);
    //  }
    //}
    //this._ct.ctx.stroke();
    //this._ct.ctx.closePath();
    //this._ct.ctx.beginPath();
    //this._ct.ctx.fillStyle = "red";
    //if (Array.isArray(obj.peaks)) {
    //  let ci: number;
    //  for (z = 0; z < obj.peaks.length; z++) {
    //    ci = obj.peaks[z].cellIndex;
    //    left = obj.peaks[z].container.left + state.container.left - state.minPx;
    //    top = Math.round(obj.peaks[z].container.top * state.gridCells[ci].microvoltsToPixel) + state.gridCells[ci].container.midOy;
    //    this._ct.ctx.moveTo(left + 0.5, top + 0.5);
    //    this._ct.ctx.arc(left + 0.5, top + 0.5, radius, 0, 2 * Math.PI, false);
    //  }
    //}
    //this._ct.ctx.fill();
    //this._ct.ctx.closePath();
    //this._ct.ctx.restore();
  }

  //-------------------------------------------------------------------------------------
  private drawFloatingPeak(obj: XDrawingObject) {
    console.info("drawFloatingPeak");

    this._ct.ctx.save();
    this._ct.ctx.restore();
  }

  //-------------------------------------------------------------------------------------
  private scroll(event: any) {
    this._dp.preparePointer(event);
    let endpoint: XPoint = this.getEventPosition(event);
    let actionPoint: XPoint = this._waveformDragStartPosition.subtract(endpoint);
    this._waveformDragStartPosition = endpoint;
    this._dp.scroll(actionPoint.left);
    this._dp.refreshDrawings();
  }

  //-------------------------------------------------------------------------------------
  private pointerMove(event: any) {
    //let timeNow: number = Date.now();
    //if (timeNow - this._lastEmitTime > this._threshold) {
    // this._lastEmitTime = timeNow;
    // this._dp.performMouseMove(event);
    //}
    this._dp.performMouseMove(event);
  }

  //-------------------------------------------------------------------------------------
  private drawSignalF2(obj: XDrawingObject) {
    //console.info("drawSignalF2");
  }

  //-------------------------------------------------------------------------------------
  private drawSignalObjectsF2(objs: SignalDrawingObject[]) {
    let state: XDrawingProxyState = this._dp.state;
    // cell index = drawing object index
    let z: number = 0, y: number = 0, left: number = 0, top: number = 0, dy: number;
    this._ct.ctx.save();
    //TODO: move to separated client
    this._ct.ctx.beginPath();
    for (z = 0; z < state.gridCells.length; z++) {
      // borders
      this._ct.ctx.moveTo(state.gridCells[z].container.minOx, state.gridCells[z].container.minOy);
      this._ct.ctx.lineTo(state.gridCells[z].container.maxOx, state.gridCells[z].container.minOy);
      this._ct.ctx.lineTo(state.gridCells[z].container.maxOx, state.gridCells[z].container.maxOy);
      this._ct.ctx.lineTo(state.gridCells[z].container.minOx, state.gridCells[z].container.maxOy);
      this._ct.ctx.lineTo(state.gridCells[z].container.minOx, state.gridCells[z].container.minOy);
      // ox axis
      this._ct.ctx.moveTo(state.gridCells[z].container.minOx, state.gridCells[z].container.midOy);
      this._ct.ctx.lineTo(state.gridCells[z].container.maxOx, state.gridCells[z].container.midOy);
    }
    this._ct.ctx.strokeStyle = "red";
    this._ct.ctx.globalAlpha = 0.15;
    this._ct.ctx.closePath();
    this._ct.ctx.stroke();
    this._ct.ctx.closePath();

    this._ct.ctx.beginPath();
    let points: XPoint[];
    let shift: number = 0;
    for (z = 0; z < state.gridCells.length; z++) {
      // TODO: handle multy polylines
      points = objs[z].polylines[0].points;
      y = 0;
      left = points[y].left + 0.5 - objs[z].container.left + state.gridCells[z].container.left;
      dy = Math.round(points[y].top * state.gridCells[z].microvoltsToPixel); // microvolts to pixels
      top = dy + 0.5 + objs[z].container.top + state.gridCells[z].container.midOy + shift;
      this._ct.ctx.moveTo(left, top);
      for (y++; y < points.length; y++) {
        left = points[y].left + 0.5 - objs[z].container.left + state.gridCells[z].container.left;
        dy = Math.round(points[y].top * state.gridCells[z].microvoltsToPixel);
        top = dy + 0.5 + objs[z].container.top + state.gridCells[z].container.midOy + shift;
        this._ct.ctx.lineTo(left, top);
      }
    }
    this._ct.ctx.lineWidth = 1;
    this._ct.ctx.strokeStyle = this._signalF2Client.color;
    this._ct.ctx.globalAlpha = this._signalF2Client.opacity;
    this._ct.ctx.stroke();
    this._ct.ctx.closePath();
    this._ct.ctx.restore();
  }

  //-------------------------------------------------------------------------------------
  private drawBeatsF2(obj: XDrawingObject) {
    ///console.info("drawBeatsF2");
  }

  //-------------------------------------------------------------------------------------
  private drawBeatsObjectsF2(objs: BeatsDrawingObject[]) {
    let z: number = 0, y: number = 0, left: number = 0, top: number = 0, dy: number;
    let state: XDrawingProxyState = this._dp.state;
    // cell index = drawing object index
    this._ct.ctx.save();
    this._ct.ctx.beginPath();
    let points: XPoint[];
    let shift: number = 0;
    for (z = 0; z < state.gridCells.length; z++) {
      points = objs[z].points;
      for (y = 0; y < points.length; y++) {
        left = points[y].left + 0.5 - objs[z].container.left + state.gridCells[z].container.left;
        dy = Math.round(points[y].top * state.gridCells[z].microvoltsToPixel); // microvolts to pixels
        top = dy + 0.5 + objs[z].container.top + state.gridCells[z].container.midOy + shift;
        this._ct.ctx.moveTo(left + 0.5, top + 0.5);
        this._ct.ctx.arc(left + 0.5, top + 0.5, this._beatsF2Client.radius, 0, 2 * Math.PI, false);
      }
    }
    this._ct.ctx.fillStyle = this._beatsF2Client.color;
    this._ct.ctx.globalAlpha = this._beatsF2Client.opacity;
    this._ct.ctx.fill();
    this._ct.ctx.closePath();
    this._ct.ctx.restore();
  }

  //-------------------------------------------------------------------------------------
  private drawFPointObjectsF2(objs: FPointDrawingObject[]) {
    this._ct.ctx.save();
    let state: XDrawingProxyState = this._dp.state;
    let z: number = 0, y: number = 0, left: number = 0, top: number = 0, dy: number;
    let obj: FPointDrawingObject = objs[0];
    this._ct.ctx.globalAlpha = this._fpointF2Client.opacity;
    // pointer line
    this._ct.ctx.beginPath();
    left = state.container.left + obj.lines[0].ax;
    top = state.container.top + obj.lines[0].ay;
    this._ct.ctx.moveTo(left + 0.5, top + 0.5);
    top = state.container.top + obj.lines[0].by;
    this._ct.ctx.lineTo(left + 0.5, top + 0.5);
    this._ct.ctx.strokeStyle = this._fpointF2Client.lineColor;
    this._ct.ctx.stroke();
    this._ct.ctx.closePath();

    let testShift: number = 0;
    this._ct.ctx.beginPath();
    this._ct.ctx.fillStyle = this._fpointF2Client.pointColor;
    for (let z: number = 0; z < state.gridCells.length; z++) {
      // cell index = point index
      left = state.container.left + obj.points[z].left + 0.5;
      dy = Math.floor(obj.points[z].top * state.gridCells[z].microvoltsToPixel);
      top = dy + state.gridCells[z].container.midOy + testShift + 0.5;
      this._ct.ctx.moveTo(left + 0.5, top + 0.5);
      this._ct.ctx.arc(left + 0.5, top + 0.5, this._fpointF2Client.pointRadius, 0, 2 * Math.PI, false);
    }
    this._ct.ctx.fill();
    this._ct.ctx.closePath();

    this._ct.ctx.restore();
  }


}
