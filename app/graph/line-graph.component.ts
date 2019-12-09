import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

interface Point {
    x: number;
    y: number;
}

interface GraphSettings {
    lineStroke?: number;
    circleSize?: number;
    circleStroke?: number;
    tooltipOffset?: number;
}

@Component({
    selector: 'app-graph',
    templateUrl: './line-graph.component.html',
    styleUrls: ['./line-graph.component.scss']
})
export class LineGraphComponent implements OnInit, OnDestroy {

    @ViewChild('svg', {static: true}) svg: ElementRef;
    @ViewChild('line', {static: true}) line: ElementRef;
    @ViewChild('overlay', {static: true}) overlay: ElementRef;
    @ViewChild('tooltip', {static: true}) tooltip: ElementRef;
    @ViewChild('bg', {static: true}) bg: ElementRef;

    @Input() settings: GraphSettings = {
        lineStroke: 3,
        circleSize: 10,
        circleStroke: 3,
        tooltipOffset: 40
    };

    viewBox: number[];
    ratio: number;
    points: Point[];
    path: string;
    circleDiameter: number;
    circleDiameterPx: number;
    circleRadius: number;

    mouseMove$: Subscription;
    firstHover = true;

    fakeJson;

    @HostListener('window:resize', [])
    onResize() {
        this.Resize();
    }

    constructor(private renderer: Renderer2) {

    }

    ngOnInit() {
        this.SetRandomJSON(7);

        this.SetRatioAndViewBox();
        this.SetPoints();
        this.SetPath();
        this.SetLine();
        this.CreateCircles();
        this.SetCircleStyles();
        this.SetOverlay();
        this.SetBg();
        this.SetTooltipListener();
    }

    SetRandomJSON(count: number) {
        const obj = {
            items: []
        };

        for (let i = 0; i < count; i++) {
            obj.items.push({
                count: Math.round((Math.random() * 10) + 5)
            });
        }

        this.fakeJson = obj;
    }

    SetRatioAndViewBox() {
        this.viewBox = this.svg.nativeElement.getAttribute('viewBox').split(' ').map(str => parseFloat(str));
        this.ratio = this.viewBox[2] / this.svg.nativeElement.getBoundingClientRect().width;
        this.circleRadius = this.ratio * this.settings.circleSize;

        const circleStroke = this.ratio * this.settings.circleStroke / 2;
        const circleSize = this.ratio * -this.settings.circleSize;
        const newSize = circleSize - circleStroke;

        this.viewBox[0] = newSize;
        this.viewBox[1] = newSize;
        this.renderer.setAttribute(this.svg.nativeElement,
            'viewBox',
            this.viewBox.join(' ')
        );
    }

    SetPoints() {
        const maxY = Math.max(...this.fakeJson.items.map(item => item.count));
        const circleSize = this.ratio * this.settings.circleSize * 2;
        const circleStroke = this.ratio * this.settings.circleStroke;
        const offset = circleSize + circleStroke;

        const stepSizeX = (this.viewBox[2] - offset) / (this.fakeJson.items.length - 1);
        const stepSizeY = (this.viewBox[3] - offset) / maxY;

        this.points = this.fakeJson.items.reduce((acc, cur, i) => {
            acc.push(
                {
                    x: Math.round((i * stepSizeX) * 10000) / 10000,
                    y: Math.round(((maxY - cur.count) * stepSizeY) * 10000) / 10000
                }
            );

            return acc;
        }, []);
    }

    SetPath() {
        const paths = [];

        this.points.forEach((point, i) => {
            if (i === 0) {
                paths.push(`M0 ${point.y}`);
                paths.push(`L${point.x} ${point.y}`);
            } else {
                paths.push(`L${point.x} ${point.y}`);
            }
        });

        this.path = paths.join(' ');
    }

    SetLine() {
        const lineElement = this.line.nativeElement;

        this.renderer.setAttribute(lineElement, 'd', this.path);

        this.renderer.setStyle(lineElement, 'strokeDasharray', `${lineElement.getTotalLength()}px`);
        this.renderer.setStyle(lineElement, 'strokeDasharray', `0, ${lineElement.getTotalLength()}`);

        // Needed for Edge browser, for the line animation
        setTimeout(() => {
            this.renderer.addClass(lineElement, 'transition');
            this.renderer.setStyle(lineElement, 'strokeDasharray', `${lineElement.getTotalLength()}, 0`);
        });

        this.SetLineStroke();
    }

    SetLineStroke() {
        this.line.nativeElement.style.strokeWidth = `${this.settings.lineStroke * this.ratio}px`;
    }

    CreateCircles() {
        this.points.forEach((point, i) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', (point.x).toString());
            circle.setAttribute('cy', (point.y).toString());
            circle.setAttribute('r', (this.ratio * this.settings.circleSize).toString());
            circle.setAttribute('fill', 'white');
            circle.setAttribute('stroke', '#ff7714');
            circle.setAttribute('stroke-width', (this.ratio * this.settings.circleStroke).toString());
            circle.setAttribute('data-content', this.fakeJson.items[i].count.toString());

            this.renderer.appendChild(
                this.svg.nativeElement,
                circle
            );
        });
    }

    SetCirclePosition() {
        Array.from<HTMLElement>(this.svg.nativeElement.getElementsByTagName('circle')).forEach((circle, i) => {
            circle.setAttribute('cx', (this.points[i].x).toString());
            circle.setAttribute('cy', (this.points[i].y).toString());
        });
    }

    SetCircleStyles() {
        Array.from<HTMLElement>(this.svg.nativeElement.getElementsByTagName('circle')).forEach(circle => {
            circle.setAttribute('r', (this.ratio * this.settings.circleSize).toString());
            circle.setAttribute('stroke-width', (this.ratio * this.settings.circleStroke).toString());
        });

        this.circleDiameter = this.ratio * this.settings.circleSize * 2;
        this.circleDiameterPx = this.svg.nativeElement.getElementsByTagName('circle')[0].getBoundingClientRect().width;
    }

    SetOverlay() {
        this.renderer.setAttribute(
            this.overlay.nativeElement,
            'd',
            `${this.path}
            L100 ${this.points[this.points.length - 1].y}
            L100 ${this.viewBox[0]}
            L${this.viewBox[0]} ${this.viewBox[1]}
            L${this.viewBox[0]} ${this.points[0].y}`
        );
    }

    SetBg() {
        this.renderer.setAttribute(
            this.bg.nativeElement,
            'd',
            `M0 0 L0 42 L${100 - this.circleDiameter} 42 L${100 - this.circleDiameter} 0 Z`
        );
    }

    SetTooltipListener() {
        this.mouseMove$ = fromEvent<MouseEvent>(this.svg.nativeElement, 'mousemove')
            .pipe(throttleTime(50))
            .subscribe((a: MouseEvent) => {
                const element = a.target as SVGCircleElement;

                if (element.tagName === 'circle') {
                    this.SetTooltip(element);
                }
            });
    }

    SetTooltip(circle: SVGCircleElement) {
        const parentPosition = this.svg.nativeElement.getBoundingClientRect();
        console.log(this.svg.nativeElement.getBoundingClientRect().top);

        if (this.tooltip.nativeElement.innerHTML !== circle.getAttribute('data-content')) {
            this.renderer.setProperty(
                this.tooltip.nativeElement,
                'innerHTML',
                circle.getAttribute('data-content')
            );
        }

        const difference = Math.abs(this.tooltip.nativeElement.clientWidth - circle.getBoundingClientRect().width);

        if (!this.firstHover) {
            this.renderer.addClass(
                this.tooltip.nativeElement,
                'transition'
            );
        }

        this.renderer.setStyle(
            this.tooltip.nativeElement,
            'transform',
            `translate(
            calc(${circle.getBoundingClientRect().left + (difference / 2) - parentPosition.left}px),
            calc(${(circle.getBoundingClientRect().top + (difference / 2)) - this.settings.tooltipOffset - parentPosition.top}px)
            )`
        );

        this.firstHover = false;
    }

    ResetTooltip() {
        this.renderer.removeClass(
            this.tooltip.nativeElement,
            'transition'
        );

        this.firstHover = true;
    }

    Resize() {
        this.SetRatioAndViewBox();
        this.SetPoints();
        this.SetPath();
        this.SetLine();
        this.SetLineStroke();
        this.SetCircleStyles();
        this.SetCirclePosition();
        this.SetOverlay();
        this.ResetTooltip();
    }

    ngOnDestroy() {
        this.mouseMove$.unsubscribe();
    }
}
